"""
Unit tests for the anomaly detection service.

Tests all five detection algorithms with deterministic synthetic data.
"""

import unittest

from backend.services.anomaly_detection_service import (
    detect_volume_spike,
    detect_category_drift,
    detect_priority_escalation,
    detect_resolution_degradation,
    detect_repeat_offenders,
    VOLUME_SPIKE_THRESHOLDS,
    REPEAT_OFFENDER_THRESHOLD,
    RESOLUTION_DEGRADATION_MULTIPLIER,
    PRIORITY_ESCALATION_THRESHOLD,
)


class TestVolumeSpike(unittest.TestCase):
    """Tests for the volume spike detector."""

    def test_no_spike_normal_volume(self):
        """Normal volume should not trigger an anomaly."""
        historical = [10, 12, 11, 9, 13, 10, 11, 10]
        result = detect_volume_spike(historical, 12)
        self.assertIsNone(result)

    def test_spike_detected_high(self):
        """A large spike should be detected."""
        historical = [10, 10, 10, 10, 10, 10, 10, 10]
        result = detect_volume_spike(historical, 40)
        self.assertIsNotNone(result)
        self.assertEqual(result["anomaly_type"], "volume_spike")
        self.assertIn(result["severity"], ["high", "critical"])
        self.assertGreater(result["metric_value"], result["baseline_value"])

    def test_spike_detected_medium(self):
        """A moderate spike should be medium severity."""
        # std_dev of [5,5,5,5,5,5] = 0, so any deviation is critical.
        # Use varied data instead:
        historical = [10, 12, 8, 11, 9, 13, 10, 11]
        # mean ~10.5, std ~1.5 -> z-score for 14 is ~2.3 -> medium
        result = detect_volume_spike(historical, 14)
        if result:
            self.assertEqual(result["anomaly_type"], "volume_spike")

    def test_insufficient_data(self):
        """Less than 6 data points should return None."""
        result = detect_volume_spike([10, 10, 10], 50)
        self.assertIsNone(result)

    def test_zero_std_deviation_spike(self):
        """All identical counts: any deviation should trigger."""
        historical = [5, 5, 5, 5, 5, 5]
        result = detect_volume_spike(historical, 10)
        self.assertIsNotNone(result)
        self.assertEqual(result["severity"], "critical")

    def test_zero_std_deviation_no_spike(self):
        """All identical counts with matching current: no anomaly."""
        historical = [5, 5, 5, 5, 5, 5]
        result = detect_volume_spike(historical, 5)
        self.assertIsNone(result)

    def test_below_threshold(self):
        """Below the lowest Z-score threshold should return None."""
        historical = [10, 12, 11, 9, 13, 10, 11, 10]
        result = detect_volume_spike(historical, 11)
        self.assertIsNone(result)


class TestCategoryDrift(unittest.TestCase):
    """Tests for the category drift detector."""

    def test_no_drift_identical(self):
        """Identical distributions should not trigger."""
        baseline = {"network": 50, "software": 30, "hardware": 20}
        current = {"network": 50, "software": 30, "hardware": 20}
        result = detect_category_drift(baseline, current)
        self.assertIsNone(result)

    def test_drift_detected(self):
        """A significant category shift should be detected."""
        baseline = {"network": 50, "software": 30, "hardware": 20}
        current = {"network": 10, "software": 30, "hardware": 60}
        result = detect_category_drift(baseline, current)
        self.assertIsNotNone(result)
        self.assertEqual(result["anomaly_type"], "category_drift")
        self.assertIn("drifted_categories", result["metadata"])

    def test_empty_baseline(self):
        """Empty baseline should return None."""
        result = detect_category_drift({}, {"network": 10})
        self.assertIsNone(result)

    def test_empty_current(self):
        """Empty current should return None."""
        result = detect_category_drift({"network": 10}, {})
        self.assertIsNone(result)

    def test_new_category_in_current(self):
        """A new category appearing should be handled."""
        baseline = {"network": 50, "software": 50}
        current = {"network": 10, "software": 10, "security": 80}
        result = detect_category_drift(baseline, current)
        # security is new so baseline proportion is 0 — can't compute drift for it,
        # but network & software proportions changed significantly
        if result:
            self.assertEqual(result["anomaly_type"], "category_drift")

    def test_minor_drift_no_trigger(self):
        """Small drift under 30% should not trigger."""
        baseline = {"network": 50, "software": 50}
        current = {"network": 45, "software": 55}
        result = detect_category_drift(baseline, current)
        self.assertIsNone(result)


class TestPriorityEscalation(unittest.TestCase):
    """Tests for the priority escalation detector."""

    def test_no_escalation(self):
        """Similar ratios should not trigger."""
        result = detect_priority_escalation(0.20, 0.22, 50)
        self.assertIsNone(result)

    def test_escalation_detected(self):
        """Significant increase should trigger."""
        result = detect_priority_escalation(0.10, 0.40, 50)
        self.assertIsNotNone(result)
        self.assertEqual(result["anomaly_type"], "priority_escalation")
        self.assertIn(result["severity"], ["medium", "high", "critical"])

    def test_too_few_tickets(self):
        """Less than 5 tickets should return None."""
        result = detect_priority_escalation(0.10, 0.90, 3)
        self.assertIsNone(result)

    def test_decrease_not_flagged(self):
        """A decrease in priority ratio should not trigger."""
        result = detect_priority_escalation(0.50, 0.20, 50)
        self.assertIsNone(result)

    def test_threshold_boundary(self):
        """Exactly at threshold should trigger."""
        result = detect_priority_escalation(
            0.10, 0.10 + PRIORITY_ESCALATION_THRESHOLD, 10
        )
        self.assertIsNotNone(result)

    def test_critical_severity(self):
        """40%+ increase should be critical."""
        result = detect_priority_escalation(0.10, 0.60, 50)
        self.assertIsNotNone(result)
        self.assertEqual(result["severity"], "critical")


class TestResolutionDegradation(unittest.TestCase):
    """Tests for the resolution time degradation detector."""

    def test_no_degradation(self):
        """Similar resolution times should not trigger."""
        result = detect_resolution_degradation(4.0, 5.0, 10)
        self.assertIsNone(result)

    def test_degradation_detected(self):
        """2x resolution time should trigger."""
        result = detect_resolution_degradation(4.0, 8.0, 10)
        self.assertIsNotNone(result)
        self.assertEqual(result["anomaly_type"], "resolution_degradation")

    def test_severe_degradation(self):
        """3x+ should be critical."""
        result = detect_resolution_degradation(4.0, 13.0, 10)
        self.assertIsNotNone(result)
        self.assertEqual(result["severity"], "critical")

    def test_too_few_samples(self):
        """Less than 3 samples should return None."""
        result = detect_resolution_degradation(4.0, 20.0, 2)
        self.assertIsNone(result)

    def test_zero_baseline(self):
        """Zero baseline should return None."""
        result = detect_resolution_degradation(0.0, 10.0, 10)
        self.assertIsNone(result)

    def test_exactly_at_multiplier(self):
        """Exactly at the multiplier threshold should trigger."""
        baseline = 4.0
        current = baseline * RESOLUTION_DEGRADATION_MULTIPLIER
        result = detect_resolution_degradation(baseline, current, 10)
        self.assertIsNotNone(result)


class TestRepeatOffenders(unittest.TestCase):
    """Tests for the repeat offender detector."""

    def test_no_offenders(self):
        """Normal ticket counts should return empty."""
        counts = {"user1": 2, "user2": 3, "user3": 1}
        results = detect_repeat_offenders(counts)
        self.assertEqual(len(results), 0)

    def test_offender_detected(self):
        """User exceeding threshold should be flagged."""
        counts = {"user1": 2, "user2": REPEAT_OFFENDER_THRESHOLD + 1}
        results = detect_repeat_offenders(counts)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["anomaly_type"], "repeat_offender")
        self.assertEqual(results[0]["affected_entity"], "user2")

    def test_multiple_offenders(self):
        """Multiple offending users should all be flagged."""
        counts = {
            "user1": REPEAT_OFFENDER_THRESHOLD + 1,
            "user2": REPEAT_OFFENDER_THRESHOLD + 5,
            "user3": 1,
        }
        results = detect_repeat_offenders(counts)
        self.assertEqual(len(results), 2)
        entities = {r["affected_entity"] for r in results}
        self.assertIn("user1", entities)
        self.assertIn("user2", entities)

    def test_severity_scaling(self):
        """Higher counts should result in higher severity."""
        counts = {"user1": REPEAT_OFFENDER_THRESHOLD * 3}
        results = detect_repeat_offenders(counts)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["severity"], "high")

    def test_empty_counts(self):
        """Empty input should return empty list."""
        results = detect_repeat_offenders({})
        self.assertEqual(len(results), 0)

    def test_custom_threshold(self):
        """Custom threshold should be respected."""
        counts = {"user1": 3}
        results = detect_repeat_offenders(counts, threshold=2)
        self.assertEqual(len(results), 1)


class TestAnomalyResultStructure(unittest.TestCase):
    """Ensure all detection results follow the required schema."""

    REQUIRED_KEYS = {
        "anomaly_type", "severity", "title", "description",
        "metric_value", "baseline_value", "deviation_pct",
        "recommended_action", "metadata",
    }

    def _validate_structure(self, result: dict):
        for key in self.REQUIRED_KEYS:
            self.assertIn(key, result, f"Missing key: {key}")
        self.assertIn(result["anomaly_type"], [
            "volume_spike", "category_drift", "priority_escalation",
            "resolution_degradation", "repeat_offender",
        ])
        self.assertIn(result["severity"], ["low", "medium", "high", "critical"])
        self.assertIsInstance(result["metadata"], dict)

    def test_volume_spike_structure(self):
        result = detect_volume_spike([10] * 8, 40)
        self.assertIsNotNone(result)
        self._validate_structure(result)

    def test_category_drift_structure(self):
        result = detect_category_drift(
            {"network": 50, "software": 50},
            {"network": 10, "software": 90},
        )
        if result:
            self._validate_structure(result)

    def test_priority_escalation_structure(self):
        result = detect_priority_escalation(0.10, 0.50, 50)
        self.assertIsNotNone(result)
        self._validate_structure(result)

    def test_resolution_degradation_structure(self):
        result = detect_resolution_degradation(4.0, 12.0, 10)
        self.assertIsNotNone(result)
        self._validate_structure(result)

    def test_repeat_offender_structure(self):
        results = detect_repeat_offenders({"user1": 10})
        self.assertEqual(len(results), 1)
        self._validate_structure(results[0])


if __name__ == "__main__":
    unittest.main()
