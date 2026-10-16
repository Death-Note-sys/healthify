/**
 * Weight Controller — Optimized time-series aggregations & validations
 */

/**
 * Filter and aggregate weight logs by timeline (weekly, monthly, yearly)
 * @param {Array} logs - Raw weight log entries [{ weight, logged_at }, ...]
 * @param {string} timeline - 'weekly' | 'monthly' | 'yearly'
 * @param {number} fallbackWeight - Default weight if no entries exist
 */
export function aggregateWeightTimeline(logs = [], timeline = 'weekly', fallbackWeight = 70) {
  const sorted = [...logs].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at));
  const latestWeight = sorted.length > 0 ? sorted[sorted.length - 1].weight : fallbackWeight;

  const now = new Date();

  if (timeline === 'weekly') {
    // 7 continuous days ending today
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    let lastKnown = sorted.length > 0 ? sorted[0].weight : latestWeight;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = sorted.find(l => l.logged_at === dateStr);
      if (match) {
        lastKnown = match.weight;
      }
      result.push({
        date: dateStr,
        label: days[d.getDay()],
        weight: match ? match.weight : lastKnown,
        isLogged: !!match,
      });
    }
    return result;
  }

  if (timeline === 'monthly') {
    // 30 days ending today, sample every 2-3 days or all days
    const result = [];
    let lastKnown = sorted.length > 0 ? sorted[0].weight : latestWeight;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = sorted.find(l => l.logged_at === dateStr);
      if (match) {
        lastKnown = match.weight;
      }
      const dayNum = d.getDate();
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      result.push({
        date: dateStr,
        label: `${monthShort} ${dayNum}`,
        weight: match ? match.weight : lastKnown,
        isLogged: !!match,
      });
    }
    return result;
  }

  if (timeline === 'yearly') {
    // Past 12 calendar months
    const result = [];
    let lastKnown = sorted.length > 0 ? sorted[0].weight : latestWeight;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });

      // Find all logs in this year/month
      const monthLogs = sorted.filter(l => {
        const ld = new Date(l.logged_at);
        return ld.getFullYear() === year && ld.getMonth() === month;
      });

      let avgWeight;
      let isLogged = false;
      if (monthLogs.length > 0) {
        avgWeight = parseFloat((monthLogs.reduce((acc, curr) => acc + curr.weight, 0) / monthLogs.length).toFixed(1));
        lastKnown = avgWeight;
        isLogged = true;
      } else {
        avgWeight = lastKnown;
      }

      result.push({
        date: `${year}-${String(month + 1).padStart(2, '0')}`,
        label: monthLabel,
        weight: avgWeight,
        isLogged,
      });
    }
    return result;
  }

  return sorted;
}

/**
 * GET /api/weight/aggregate
 */
export async function getWeightAggregations(req, res) {
  try {
    const { timeline = 'weekly', fallback = 70 } = req.query;
    // Sample response structure for client / tests
    res.json({
      success: true,
      timeline,
      meta: {
        supportedTimelines: ['weekly', 'monthly', 'yearly'],
      },
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}

/**
 * POST /api/weight/validate
 * Validates weight payload before saving
 */
export async function validateWeightLog(req, res) {
  try {
    const { weight, logged_at } = req.body;
    const numWeight = parseFloat(weight);

    if (isNaN(numWeight) || numWeight <= 20 || numWeight >= 400) {
      return res.status(400).json({
        error: { message: 'Invalid weight. Weight must be a number between 20kg and 400kg.' }
      });
    }

    const targetDate = logged_at || new Date().toISOString().split('T')[0];
    if (isNaN(new Date(targetDate).getTime())) {
      return res.status(400).json({
        error: { message: 'Invalid date format for logged_at.' }
      });
    }

    res.json({
      valid: true,
      weight: parseFloat(numWeight.toFixed(1)),
      logged_at: targetDate,
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
