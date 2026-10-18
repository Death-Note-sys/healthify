import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  X,
  Check,
  Search,
  AlertCircle,
  Sparkles,
  Plus,
  Minus,
  Barcode,
  ScanBarcode,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Client-side fallback normalizer in case backend is unreachable or on static edge
export const normalizeOpenFoodFacts = (p, barcode) => {
  const n = p.nutriments || {};
  let cal100 = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
  cal100 = Math.round(Number(cal100) || 0);

  const prot100 = Math.round((Number(n.proteins_100g ?? n.proteins ?? 0)) * 10) / 10;
  const carb100 = Math.round((Number(n.carbohydrates_100g ?? n.carbohydrates ?? 0)) * 10) / 10;
  const fat100  = Math.round((Number(n.fat_100g ?? n.fat ?? 0)) * 10) / 10;
  const fib100  = Math.round((Number(n.fiber_100g ?? n.fiber ?? 0)) * 10) / 10;

  let servingGrams = 100;
  let servingLabel = p.serving_size || '100g';
  if (p.serving_quantity) {
    servingGrams = Number(p.serving_quantity) || 100;
  } else if (p.serving_size) {
    const match = p.serving_size.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
    if (match) servingGrams = parseFloat(match[1]);
  }

  let calServing = n['energy-kcal_serving'] ?? (n['energy_serving'] ? n['energy_serving'] / 4.184 : null);
  if (calServing == null && servingGrams && cal100) {
    calServing = Math.round((cal100 * servingGrams) / 100);
  } else {
    calServing = calServing != null ? Math.round(Number(calServing)) : cal100;
  }

  const protServing = n.proteins_serving != null
    ? Math.round(Number(n.proteins_serving) * 10) / 10
    : Math.round(((prot100 * servingGrams) / 100) * 10) / 10;

  const carbServing = n.carbohydrates_serving != null
    ? Math.round(Number(n.carbohydrates_serving) * 10) / 10
    : Math.round(((carb100 * servingGrams) / 100) * 10) / 10;

  const fatServing = n.fat_serving != null
    ? Math.round(Number(n.fat_serving) * 10) / 10
    : Math.round(((fat100 * servingGrams) / 100) * 10) / 10;

  const brand = p.brands ? p.brands.split(',')[0].trim() : '';
  const rawName = p.product_name || p.product_name_en || p.generic_name || 'Packaged Item';
  const fullName = brand ? `${rawName} (${brand})` : rawName;

  return {
    found: true,
    barcode: String(barcode).trim(),
    name: fullName,
    rawName,
    brand,
    image: p.image_front_small_url || p.image_url || null,
    servingLabel,
    servingGrams,
    per100g: { cal: cal100, protein: prot100, carbs: carb100, fat: fat100, fiber: fib100 },
    perServing: { cal: calServing, protein: protServing, carbs: carbServing, fat: fatServing },
    micronutrients: {
      iron: Math.round(Number(n.iron_100g || 0) * 1000 * 10) / 10,
      calcium: Math.round(Number(n.calcium_100g || 0) * 1000 * 10) / 10,
      sodium: Math.round(Number(n.sodium_100g || 0) * 1000 * 10) / 10,
      vitD: Number(n['vitamin-d_100g'] || 0),
      vitB12: Number(n['vitamin-b12_100g'] || 0)
    },
    nutriscore: p.nutriscore_grade || null
  };
};

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onLogFood,
  defaultMeal = 'lunch',
  onAskAIWithText
}) {
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Portion configuration
  const [servingMode, setServingMode] = useState('serving'); // 'serving' | '100g'
  const [multiplier, setMultiplier] = useState(1);
  const [selectedMeal, setSelectedMeal] = useState(defaultMeal);
  const [isLogged, setIsLogged] = useState(false);

  const scannerRef = useRef(null);
  const containerId = 'healthify-barcode-reader';

  // Haptic feedback + subtle audio beep
  const triggerScanFeedback = () => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([45, 30, 45]);
      }
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch (_) {}
  };

  // Fetch product information by barcode
  const handleBarcodeLookup = async (barcode) => {
    if (!barcode) return;
    const cleanCode = String(barcode).trim();
    setLoading(true);
    setCameraError(null);
    setScannedProduct(null);
    setNotFoundBarcode(null);
    triggerScanFeedback();

    // Pause / stop scanner while showing result
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Scanner pause error:', err);
      }
    }

    try {
      // 1. Try local Express API first
      let data = null;
      try {
        const res = await fetch(`/api/nutrition/barcode/${cleanCode}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn('Local barcode API unreachable, trying direct Open Food Facts...', e);
      }

      // 2. Fallback to direct Open Food Facts fetch (for client-only PWA deployments)
      if (!data || !data.found) {
        try {
          const directRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`, {
            headers: { 'User-Agent': 'HealthifyApp - Web - v1.0' }
          });
          if (directRes.ok) {
            const directJson = await directRes.json();
            if (directJson.status === 1 && directJson.product) {
              data = normalizeOpenFoodFacts(directJson.product, cleanCode);
            }
          }
        } catch (e) {
          console.warn('Direct Open Food Facts fetch failed:', e);
        }
      }

      if (data && data.found) {
        setScannedProduct(data);
        setServingMode(data.servingLabel && data.perServing?.cal ? 'serving' : '100g');
        setMultiplier(1);
        setIsLogged(false);
      } else {
        setNotFoundBarcode(cleanCode);
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      setNotFoundBarcode(cleanCode);
    } finally {
      setLoading(false);
    }
  };

  // Initialize camera scanner
  const startScanner = async () => {
    setCameraError(null);
    setScannedProduct(null);
    setNotFoundBarcode(null);
    setIsLogged(false);

    try {
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport,
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const width = Math.min(viewfinderWidth * 0.85, 320);
          const height = Math.min(viewfinderHeight * 0.45, 180);
          return { width: Math.max(220, Math.floor(width)), height: Math.max(130, Math.floor(height)) };
        },
        aspectRatio: 1.333333
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleBarcodeLookup(decodedText);
        },
        () => {
          // Frame scan error (expected on empty frames, ignore)
        }
      );

      setScannerActive(true);

      // Check torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setTorchAvailable(true);
        }
      } catch (_) {}
    } catch (err) {
      console.error('Failed to start camera:', err);
      setScannerActive(false);
      if (err?.name === 'NotAllowedError' || String(err).includes('Permission denied')) {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser settings.');
      } else if (err?.name === 'NotFoundError' || String(err).includes('device not found')) {
        setCameraError('No camera found on this device. You can enter the barcode manually below.');
      } else {
        setCameraError('Unable to access camera: ' + (err.message || 'Check browser permissions'));
      }
    }
  };

  // Stop scanner safely
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setScannerActive(false);
    setTorchOn(false);
  };

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current || !torchAvailable) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setSelectedMeal(defaultMeal);
      // Wait for DOM element to mount
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
      setScannedProduct(null);
      setNotFoundBarcode(null);
      setCameraError(null);
      setManualInput('');
    }
  }, [isOpen]);

  // Reset to scan another
  const handleScanAgain = () => {
    setScannedProduct(null);
    setNotFoundBarcode(null);
    setIsLogged(false);
    startScanner();
  };

  // Compute live active nutrition based on portion selection
  const getActiveNutrition = () => {
    if (!scannedProduct) return { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, label: '' };
    const isServing = servingMode === 'serving' && scannedProduct.perServing?.cal;
    const base = isServing ? scannedProduct.perServing : scannedProduct.per100g;
    const portionName = isServing
      ? `${multiplier}× ${scannedProduct.servingLabel || 'serving'}`
      : `${Math.round(100 * multiplier)}g`;

    return {
      cal: Math.round((base.cal || 0) * multiplier),
      protein: Math.round((base.protein || 0) * multiplier * 10) / 10,
      carbs: Math.round((base.carbs || 0) * multiplier * 10) / 10,
      fat: Math.round((base.fat || 0) * multiplier * 10) / 10,
      fiber: Math.round((base.fiber || 0) * multiplier * 10) / 10,
      label: portionName
    };
  };

  const handleConfirmLog = async () => {
    if (!scannedProduct || !onLogFood) return;
    const nut = getActiveNutrition();

    const foodItem = {
      name: scannedProduct.name,
      cal: nut.cal,
      protein: nut.protein,
      carbs: nut.carbs,
      fat: nut.fat,
      fiber: nut.fiber,
      iron: scannedProduct.micronutrients?.iron || 0,
      calcium: scannedProduct.micronutrients?.calcium || 0,
      vitD: scannedProduct.micronutrients?.vitD || 0,
      vitB12: scannedProduct.micronutrients?.vitB12 || 0,
      s: nut.label,
      unit: 'barcode',
      barcode: scannedProduct.barcode,
      image: scannedProduct.image,
      e: '🏷️'
    };

    setIsLogged(true);
    await onLogFood(foodItem, 1, selectedMeal);
    triggerScanFeedback();

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  const currentNut = getActiveNutrition();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0'
        }}>
        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: 520,
            background: 'var(--bg-surface)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--glass-border)'
          }}>

          {/* Header Bar */}
          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--glass-border)',
              background: 'var(--bg-elevated)'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
                }}>
                <ScanBarcode size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink-primary)' }}>
                  Barcode & QR Scanner
                </h3>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  Scan packaged foods for instant verified macros
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {torchAvailable && !scannedProduct && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  title={torchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
                  style={{
                    background: torchOn ? 'var(--accent-amber)' : 'var(--bg-surface)',
                    color: torchOn ? '#fff' : 'var(--ink-secondary)',
                    border: '1px solid var(--glass-border)',
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                  {torchOn ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--ink-muted)',
                  border: '1px solid var(--glass-border)',
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Scrollable Area */}
          <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>

            {/* ── State 1: Active Camera Scanning View ── */}
            {!scannedProduct && !notFoundBarcode && (
              <div>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: '#090a0f',
                    minHeight: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
                  }}>

                  {/* html5-qrcode target container */}
                  <div
                    id={containerId}
                    style={{
                      width: '100%',
                      minHeight: 280,
                      background: 'transparent'
                    }}
                  />

                  {/* High-tech Viewfinder Overlay */}
                  {scannerActive && !loading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                      {/* Reticle Target */}
                      <div
                        style={{
                          width: '78%',
                          maxWidth: 300,
                          height: 150,
                          border: '2px solid rgba(139, 92, 246, 0.45)',
                          borderRadius: 14,
                          position: 'relative',
                          boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.45), 0 0 15px rgba(139, 92, 246, 0.25)',
                          overflow: 'hidden'
                        }}>
                        {/* Target Corner Brackets */}
                        <div style={{ position: 'absolute', top: -1, left: -1, width: 18, height: 18, borderTop: '3px solid #8b5cf6', borderLeft: '3px solid #8b5cf6', borderTopLeftRadius: 10 }} />
                        <div style={{ position: 'absolute', top: -1, right: -1, width: 18, height: 18, borderTop: '3px solid #8b5cf6', borderRight: '3px solid #8b5cf6', borderTopRightRadius: 10 }} />
                        <div style={{ position: 'absolute', bottom: -1, left: -1, width: 18, height: 18, borderBottom: '3px solid #8b5cf6', borderLeft: '3px solid #8b5cf6', borderBottomLeftRadius: 10 }} />
                        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 18, height: 18, borderBottom: '3px solid #8b5cf6', borderRight: '3px solid #8b5cf6', borderBottomRightRadius: 10 }} />

                        {/* Animated Laser Scanning Line */}
                        <motion.div
                          animate={{ y: [0, 148, 0] }}
                          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                          style={{
                            width: '100%',
                            height: 2,
                            background: 'linear-gradient(90deg, transparent, #8b5cf6, #ec4899, #8b5cf6, transparent)',
                            boxShadow: '0 0 8px #a855f7, 0 0 16px #8b5cf6'
                          }}
                        />
                      </div>

                      <div
                        style={{
                          marginTop: 14,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600,
                          background: 'rgba(0,0,0,0.65)',
                          padding: '4px 12px',
                          borderRadius: 99,
                          letterSpacing: '0.02em',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                        Align barcode within the frame
                      </div>
                    </div>
                  )}

                  {/* Loading indicator */}
                  {loading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        zIndex: 10
                      }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{ color: '#8b5cf6' }}>
                        <RefreshCw size={36} />
                      </motion.div>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                        Fetching product nutrition...
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                        Querying Open Food Facts database
                      </div>
                    </div>
                  )}

                  {/* Camera Error Message */}
                  {cameraError && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        padding: 24,
                        background: 'rgba(20, 10, 10, 0.95)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        zIndex: 10
                      }}>
                      <AlertCircle size={40} color="var(--accent-red)" style={{ marginBottom: 12 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                        Camera Notice
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 16, lineHeight: 1.4 }}>
                        {cameraError}
                      </div>
                      <button
                        type="button"
                        onClick={startScanner}
                        className="btn-secondary"
                        style={{ padding: '8px 16px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <RefreshCw size={14} /> Try Camera Again
                      </button>
                    </div>
                  )}
                </div>

                {/* Manual Barcode Input Fallback Drawer */}
                <div style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setShowManual(!showManual)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink-secondary)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      margin: '0 auto',
                      padding: 4
                    }}>
                    <Barcode size={15} />
                    {showManual ? 'Hide manual entry' : 'Trouble scanning? Enter barcode digits manually'}
                  </button>

                  {showManual && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{ marginTop: 10 }}>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (manualInput.trim()) {
                            handleBarcodeLookup(manualInput.trim());
                          }
                        }}
                        style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g. 3017620422003 (UPC/EAN)"
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value.replace(/[^0-9]/g, ''))}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: '1px solid var(--glass-border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--ink-primary)',
                            fontSize: 13,
                            fontFamily: 'inherit'
                          }}
                        />
                        <button
                          type="submit"
                          disabled={loading || !manualInput.trim()}
                          className="btn-primary"
                          style={{ padding: '0 16px', fontSize: 13, fontWeight: 600 }}>
                          Lookup
                        </button>
                      </form>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ── State 2: Scanned Product Found ── */}
            {scannedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Product Card Header */}
                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'center',
                    padding: 14,
                    background: 'var(--bg-elevated)',
                    borderRadius: 16,
                    border: '1px solid var(--glass-border)'
                  }}>
                  {scannedProduct.image ? (
                    <img
                      src={scannedProduct.image}
                      alt={scannedProduct.name}
                      style={{
                        width: 58,
                        height: 58,
                        objectFit: 'contain',
                        borderRadius: 12,
                        background: '#fff',
                        padding: 2,
                        flexShrink: 0,
                        border: '1px solid var(--glass-border)'
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.2))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        flexShrink: 0
                      }}>
                      🏷️
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {scannedProduct.brand || 'Packaged Item'}
                    </div>
                    <div
                      title={scannedProduct.name}
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--ink-primary)',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                      {scannedProduct.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                      Barcode: <span className="mono-num">{scannedProduct.barcode}</span>
                      {scannedProduct.nutriscore && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--glass-border)',
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                          Nutri-Score {scannedProduct.nutriscore}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Portion / Serving Size Selector */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-secondary)' }}>
                      Serving Size & Portion:
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: scannedProduct.perServing?.cal ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 12 }}>
                    {scannedProduct.perServing?.cal && (
                      <button
                        type="button"
                        onClick={() => setServingMode('serving')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: servingMode === 'serving' ? '2px solid #8b5cf6' : '1px solid var(--glass-border)',
                          background: servingMode === 'serving' ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-elevated)',
                          color: servingMode === 'serving' ? '#8b5cf6' : 'var(--ink-primary)',
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2
                        }}>
                        <span>1 Serving</span>
                        <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>({scannedProduct.servingLabel || 'Std serving'})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setServingMode('100g')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: servingMode === '100g' ? '2px solid #8b5cf6' : '1px solid var(--glass-border)',
                        background: servingMode === '100g' ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-elevated)',
                        color: servingMode === '100g' ? '#8b5cf6' : 'var(--ink-primary)',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                      }}>
                      <span>100 Grams</span>
                      <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>Standardized base</span>
                    </button>
                  </div>

                  {/* Quantity Stepper */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 12,
                      border: '1px solid var(--glass-border)'
                    }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-secondary)' }}>
                      Quantity Multiplier:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setMultiplier(prev => Math.max(0.25, parseFloat((prev - 0.25).toFixed(2))))}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid var(--glass-border)',
                          background: 'var(--bg-surface)',
                          color: 'var(--ink-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}>
                        <Minus size={14} />
                      </button>

                      <span className="mono-num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink-primary)', minWidth: 42, textAlign: 'center' }}>
                        {multiplier}×
                      </span>

                      <button
                        type="button"
                        onClick={() => setMultiplier(prev => parseFloat((prev + 0.25).toFixed(2)))}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: '1px solid var(--glass-border)',
                          background: 'var(--bg-surface)',
                          color: 'var(--ink-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Macro Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div style={{ padding: '10px 4px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                    <div className="mono-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-primary)' }}>{currentNut.cal}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 2 }}>Calories</div>
                  </div>

                  <div style={{ padding: '10px 4px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                    <div className="mono-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)' }}>{currentNut.protein}g</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 2 }}>Protein</div>
                  </div>

                  <div style={{ padding: '10px 4px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                    <div className="mono-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>{currentNut.carbs}g</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 2 }}>Carbs</div>
                  </div>

                  <div style={{ padding: '10px 4px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                    <div className="mono-num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-amber)' }}>{currentNut.fat}g</div>
                    <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 2 }}>Fat</div>
                  </div>
                </div>

                {/* Meal Destination Selector */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>
                    Log to Meal:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {[
                      { key: 'breakfast', label: 'Breakfast', emoji: '☕' },
                      { key: 'lunch',     label: 'Lunch',     emoji: '🥗' },
                      { key: 'dinner',    label: 'Dinner',    emoji: '🍲' },
                      { key: 'snack',     label: 'Snack',     emoji: '🍎' }
                    ].map(m => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setSelectedMeal(m.key)}
                        style={{
                          padding: '8px 4px',
                          borderRadius: 10,
                          border: selectedMeal === m.key ? '1px solid #8b5cf6' : '1px solid var(--glass-border)',
                          background: selectedMeal === m.key ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-elevated)',
                          color: selectedMeal === m.key ? '#8b5cf6' : 'var(--ink-secondary)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 3
                        }}>
                        <span style={{ fontSize: 14 }}>{m.emoji}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleScanAgain}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 600 }}>
                    Scan Another
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmLog}
                    disabled={isLogged}
                    className="btn-primary"
                    style={{
                      flex: 2,
                      padding: '12px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: isLogged ? 'var(--accent-green)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}>
                    {isLogged ? (
                      <>
                        <Check size={16} /> Logged to {selectedMeal}!
                      </>
                    ) : (
                      <>
                        <Check size={16} /> Log to {selectedMeal} · {currentNut.cal} kcal
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── State 3: Barcode Not Found ── */}
            {notFoundBarcode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'var(--bg-elevated)',
                  borderRadius: 16,
                  border: '1px solid var(--glass-border)'
                }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--accent-red)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px'
                  }}>
                  <Barcode size={26} />
                </div>

                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--ink-primary)' }}>
                  Product Not in Database
                </h4>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 16, lineHeight: 1.4 }}>
                  Barcode <span className="mono-num" style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{notFoundBarcode}</span> wasn't found in Open Food Facts yet.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 320, margin: '0 auto' }}>
                  {onAskAIWithText && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onAskAIWithText('');
                      }}
                      className="btn-primary"
                      style={{ padding: '10px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Sparkles size={15} /> Type Name & Estimate with AI
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleScanAgain}
                    className="btn-secondary"
                    style={{ padding: '10px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RefreshCw size={14} /> Scan Another Barcode
                  </button>
                </div>
              </motion.div>
            )}

          </div>

          {/* Footer note */}
          <div
            style={{
              padding: '10px 20px',
              borderTop: '1px solid var(--glass-border)',
              background: 'var(--bg-elevated)',
              fontSize: 11,
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Info size={12} /> Powered by Open Food Facts (Free & Open Source)
            </span>
            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
              0 API Cost
            </span>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
