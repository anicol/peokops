"""
Demo data creation for trial users to provide instant value experience.
"""
import random
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.files.base import ContentFile
from videos.models import Video, VideoFrame
from inspections.models import Inspection, Finding, ActionItem
from brands.models import Store


def create_demo_videos_and_inspections(user, store):
    """Create realistic demo videos and inspections for trial users."""
    
    demo_scenarios = [
        {
            "title": "Kitchen Morning Prep - Main Location",
            "description": "Morning prep routine in main kitchen area",
            "duration": 142.5,
            "overall_score": 78.5,
            "ppe_score": 85.0,
            "safety_score": 72.0,
            "cleanliness_score": 80.0,
            "uniform_score": 75.0,
            "findings": [
                {
                    "category": "PPE",
                    "severity": "MEDIUM",
                    "title": "Missing Hair Nets",
                    "description": "2 team members observed without proper hair restraints during food prep",
                    "timestamp": 45.2,
                    "confidence": 0.92,
                    "location": "Main prep station",
                },
                {
                    "category": "CLEANLINESS", 
                    "severity": "LOW",
                    "title": "Sanitizer Bottle Placement",
                    "description": "Sanitizer bottle left on food prep surface instead of designated area",
                    "timestamp": 78.8,
                    "confidence": 0.87,
                    "location": "Prep counter",
                },
                {
                    "category": "SAFETY",
                    "severity": "HIGH", 
                    "title": "Wet Floor Without Signage",
                    "description": "Wet area near dishwashing station without proper warning signs",
                    "timestamp": 102.1,
                    "confidence": 0.95,
                    "location": "Dish pit area",
                },
            ]
        },
        {
            "title": "Front Counter Service Rush",
            "description": "Lunch rush period customer service area",
            "duration": 95.3,
            "overall_score": 92.0,
            "ppe_score": 95.0,
            "safety_score": 88.0,
            "cleanliness_score": 94.0,
            "uniform_score": 91.0,
            "findings": [
                {
                    "category": "UNIFORM",
                    "severity": "LOW",
                    "title": "Name Tag Missing",
                    "description": "Cashier #2 not wearing required name tag during customer service",
                    "timestamp": 23.5,
                    "confidence": 0.89,
                    "location": "Register 2",
                },
                {
                    "category": "CLEANLINESS",
                    "severity": "LOW", 
                    "title": "Countertop Cleaning",
                    "description": "Counter surface needs attention - visible crumbs near POS station",
                    "timestamp": 67.8,
                    "confidence": 0.82,
                    "location": "Front counter",
                },
            ]
        },
        {
            "title": "Closing Procedures Check",
            "description": "End of day cleaning and closing routine",
            "duration": 180.7,
            "overall_score": 85.5,
            "ppe_score": 88.0,
            "safety_score": 80.0,
            "cleanliness_score": 87.0,
            "uniform_score": 87.0,
            "findings": [
                {
                    "category": "SAFETY",
                    "severity": "MEDIUM",
                    "title": "Chemical Storage Issue",
                    "description": "Cleaning chemicals stored above food prep area - should be relocated",
                    "timestamp": 134.2,
                    "confidence": 0.91,
                    "location": "Storage room",
                },
                {
                    "category": "CLEANLINESS",
                    "severity": "MEDIUM",
                    "title": "Grease Trap Maintenance",
                    "description": "Grease trap shows signs of needed maintenance - schedule cleaning",
                    "timestamp": 156.9,
                    "confidence": 0.88,
                    "location": "Kitchen drain area",
                },
                {
                    "category": "PPE",
                    "severity": "LOW",
                    "title": "Glove Change Protocol",
                    "description": "Staff member handled cleaning supplies then food without glove change",
                    "timestamp": 98.4,
                    "confidence": 0.85,
                    "location": "Prep station",
                },
            ]
        }
    ]
    
    created_videos = []
    created_inspections = []
    
    for i, scenario in enumerate(demo_scenarios):
        # Create dates going back 1-7 days for realistic timeline
        created_date = timezone.now() - timedelta(days=random.randint(1, 7), 
                                                  hours=random.randint(0, 23), 
                                                  minutes=random.randint(0, 59))
        
        # Create demo video (without actual file for demo purposes)
        video = Video.objects.create(
            uploaded_by=user,
            store=store,
            title=scenario["title"],
            description=scenario["description"],
            duration=scenario["duration"],
            file_size=random.randint(25000000, 85000000),  # 25-85MB realistic range
            status=Video.Status.COMPLETED,
            metadata={
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "codec": "h264",
                "demo_mode": True,
            },
            created_at=created_date,
            updated_at=created_date + timedelta(minutes=random.randint(2, 8))
        )
        
        # Create inspection with realistic AI analysis
        inspection = Inspection.objects.create(
            created_by=user,
            store=store,
            title=video.title,
            mode=Inspection.Mode.COACHING,  # Trial users get coaching mode
            status=Inspection.Status.COMPLETED,
            overall_score=scenario["overall_score"],
            ppe_score=scenario["ppe_score"],
            safety_score=scenario["safety_score"],
            cleanliness_score=scenario["cleanliness_score"],
            uniform_score=scenario["uniform_score"],
            ai_analysis={
                "processing_time": round(random.uniform(15.2, 45.8), 1),
                "frames_analyzed": random.randint(120, 350),
                "confidence_avg": round(random.uniform(0.82, 0.96), 2),
                "model_version": "v2.1.3",
                "demo_mode": True,
                "categories_detected": ["PPE", "SAFETY", "CLEANLINESS", "UNIFORM"],
            },
            expires_at=timezone.now() + timedelta(days=7),  # Trial retention period
            created_at=created_date + timedelta(minutes=random.randint(2, 8)),
        )

        # Link video to inspection
        video.inspection = inspection
        video.save()

        # Create findings and action items
        for finding_data in scenario["findings"]:
            finding = Finding.objects.create(
                inspection=inspection,
                category=finding_data["category"],
                severity=finding_data["severity"],
                title=finding_data["title"],
                description=finding_data["description"],
                confidence=finding_data["confidence"],
                bounding_box={
                    "x": random.uniform(0.1, 0.8),
                    "y": random.uniform(0.1, 0.8), 
                    "width": random.uniform(0.1, 0.3),
                    "height": random.uniform(0.1, 0.3),
                    "timestamp": finding_data["timestamp"],
                    "location": finding_data["location"],
                },
                recommended_action=f"Address {finding_data['title'].lower()} in {finding_data['location']}",
            )
            
            # Create corresponding action item
            priority_map = {"LOW": "LOW", "MEDIUM": "MEDIUM", "HIGH": "HIGH"}
            action_title_map = {
                "Missing Hair Nets": "Train staff on proper hair restraint requirements",
                "Sanitizer Bottle Placement": "Review sanitizer placement protocols with team",
                "Wet Floor Without Signage": "Implement wet floor signage procedures",
                "Name Tag Missing": "Ensure all staff have proper name tags",
                "Countertop Cleaning": "Schedule additional front counter cleaning",
                "Chemical Storage Issue": "Relocate cleaning chemicals to proper storage",
                "Grease Trap Maintenance": "Schedule grease trap professional cleaning",
                "Glove Change Protocol": "Retrain staff on proper glove change procedures",
            }
            
            ActionItem.objects.create(
                inspection=inspection,
                finding=finding,
                title=action_title_map.get(finding_data["title"], f"Address {finding_data['title']}"),
                description=f"Follow up on: {finding_data['description']}",
                priority=priority_map[finding_data["severity"]],
                assigned_to=user,
                status=ActionItem.Status.OPEN,
                due_date=timezone.now() + timedelta(days=random.randint(3, 14)),
                notes=f"Demo action item - estimated {random.randint(15, 120)} minutes to complete"
            )
        
        created_videos.append(video)
        created_inspections.append(inspection)
    
    return {
        "videos": created_videos,
        "inspections": created_inspections,
        "message": f"Created {len(created_videos)} demo videos with {len(demo_scenarios)} inspections"
    }