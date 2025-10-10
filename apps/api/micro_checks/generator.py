"""
Micro-check template generator for onboarding.
Loads check templates from JSON files based on brand industry and focus areas.
"""
import json
import os
import random
from pathlib import Path
from typing import List, Dict, Optional


class MicroCheckGenerator:
    """Generate personalized micro-checks based on brand profile."""

    def __init__(self):
        self.templates_dir = Path(__file__).parent / 'templates'
        self._template_cache = {}

    def load_template(self, industry: str, focus: str) -> Optional[Dict]:
        """
        Load a template JSON file for given industry and focus.

        Args:
            industry: Industry type (RESTAURANT, RETAIL, HOSPITALITY, OTHER)
            focus: Focus area (food_safety, cleanliness, customer_experience, etc.)

        Returns:
            Dict with 'industry', 'focus', and 'checks' array, or None if not found
        """
        # Build filename from industry and focus
        industry_lower = industry.lower()
        focus_normalized = focus.replace('_', '')

        # Try exact match first
        filename = f"{industry_lower}_{focus}.json"
        filepath = self.templates_dir / filename

        if not filepath.exists():
            # Try without underscores in focus
            filename = f"{industry_lower}_{focus_normalized}.json"
            filepath = self.templates_dir / filename

        if not filepath.exists():
            return None

        # Check cache
        cache_key = f"{industry}:{focus}"
        if cache_key in self._template_cache:
            return self._template_cache[cache_key]

        # Load from file
        try:
            with open(filepath, 'r') as f:
                template_data = json.load(f)
                self._template_cache[cache_key] = template_data
                return template_data
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading template {filepath}: {e}")
            return None

    def get_today_checks(self, industry: str, focus_areas: List[str], count: int = 3) -> List[Dict]:
        """
        Get randomized micro-checks for today based on brand profile.

        Args:
            industry: Brand industry (RESTAURANT, RETAIL, HOSPITALITY, OTHER)
            focus_areas: List of focus areas (e.g., ['food_safety', 'cleanliness'])
            count: Number of checks to return (default 3)

        Returns:
            List of check dicts with id, title, description, category, etc.
        """
        all_checks = []

        # Load templates for each focus area
        for focus in focus_areas:
            template = self.load_template(industry, focus)
            if template and 'checks' in template:
                all_checks.extend(template['checks'])

        # If no checks found for specified combos, try fallback to cleanliness
        if not all_checks:
            fallback_template = self.load_template(industry, 'cleanliness')
            if fallback_template and 'checks' in fallback_template:
                all_checks.extend(fallback_template['checks'])

        # Still no checks? Return empty
        if not all_checks:
            return []

        # Randomly select 'count' checks
        if len(all_checks) <= count:
            return all_checks

        return random.sample(all_checks, count)

    def get_available_templates(self) -> List[Dict]:
        """
        Get list of all available template files.

        Returns:
            List of dicts with 'industry', 'focus', 'filename'
        """
        available = []

        if not self.templates_dir.exists():
            return available

        for filepath in self.templates_dir.glob('*.json'):
            # Parse filename: industry_focus.json
            parts = filepath.stem.split('_', 1)
            if len(parts) == 2:
                industry, focus = parts
                available.append({
                    'industry': industry.upper(),
                    'focus': focus,
                    'filename': filepath.name
                })

        return available


# Global generator instance
generator = MicroCheckGenerator()
