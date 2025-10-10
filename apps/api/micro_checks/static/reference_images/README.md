# Reference Images for Micro-Check Templates

This directory contains reference images that show "what good looks like" for default micro-check templates.

## Adding Images

To add reference images to the default templates:

1. **Add image files to this directory** with descriptive names matching the templates:
   - `hand-sink-stocked.jpg`
   - `food-temperature-check.jpg`
   - `food-storage-proper.jpg`
   - `sanitizer-buckets-fresh.jpg`
   - `floors-clean-dry.jpg`
   - `prep-surfaces-sanitized.jpg`
   - `trash-containers-managed.jpg`
   - `fire-extinguisher-accessible.jpg`
   - `exit-paths-clear.jpg`
   - `wet-floor-signs-used.jpg`
   - `staff-wearing-gloves.jpg`
   - `hair-restraints-worn.jpg`
   - `refrigeration-temperatures.jpg`
   - `equipment-clean-functional.jpg`
   - `dishwasher-operating.jpg`

2. **Image requirements**:
   - Format: JPG, PNG, or WebP
   - Recommended size: 1200x800px or similar 3:2 aspect ratio
   - Max file size: 2MB
   - Show a clear, well-lit example of the check passing

3. **Update the template definition** in `default_templates.py`:
   ```python
   {
       'title': 'Hand Sink Stocked',
       # ... other fields ...
       'visual_reference_image': 'reference_images/hand-sink-stocked.jpg',
   }
   ```

4. **Run the seed command** to update templates:
   ```bash
   python manage.py seed_micro_check_templates --update
   ```

## Image Guidelines

**Good reference images:**
- Clear, well-lit photos
- Show the actual standard being met
- Taken from the manager's perspective
- Include context (e.g., full hand sink, not just soap dispenser)
- Professional quality (not blurry or cluttered)

**Avoid:**
- Stock photos that don't match real restaurant environments
- Close-ups that miss important context
- Images with branding or identifying information
- Photos showing non-compliance
