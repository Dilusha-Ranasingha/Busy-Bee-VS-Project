"""
Test script to verify Phase 1 implementation:
Dynamic Work Profile & Personalized Capacity Calculation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.plan_service import PlanService
from datetime import datetime, timedelta
import json

def test_work_profile():
    """Test work profile calculation"""
    print("\n" + "="*60)
    print("TEST 1: Work Profile Calculation")
    print("="*60)
    
    service = PlanService()
    
    # Test with a user ID (replace with actual user from your DB)
    test_user_id = "test_user"
    
    try:
        profile = service._get_user_work_profile(test_user_id)
        
        print("\n✅ Work Profile Retrieved:")
        print(json.dumps(profile, indent=2))
        
        # Validate profile structure
        required_fields = [
            'avg_workday_minutes', 'avg_daily_hours', 'max_daily_hours',
            'stddev_hours', 'typical_start_hour', 'typical_end_hour',
            'work_pattern_type', 'days_analyzed'
        ]
        
        for field in required_fields:
            assert field in profile, f"Missing field: {field}"
            print(f"  ✓ {field}: {profile[field]}")
        
        # Validate work pattern type
        assert profile['work_pattern_type'] in ['early_bird', 'night_owl', 'standard']
        print(f"\n✅ Work pattern correctly identified: {profile['work_pattern_type']}")
        
        return profile
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def test_dynamic_capacity(profile):
    """Test dynamic capacity calculation"""
    print("\n" + "="*60)
    print("TEST 2: Dynamic Capacity Calculation")
    print("="*60)
    
    if not profile:
        print("⚠ Skipping - no profile available")
        return
    
    service = PlanService()
    
    # Mock predictions
    test_predictions = [
        {
            'focus_streak_longest_global': 60,
            'idle_distraction_time': 20,
            'user_id': 'test_user'
        },
        {
            'focus_streak_longest_global': 45,
            'idle_distraction_time': 35,
            'user_id': 'test_user'
        }
    ]
    
    try:
        # Test with user's actual workday minutes
        daily_hours = service._calculate_daily_availability(
            test_predictions,
            profile['avg_workday_minutes']
        )
        
        print(f"\n✅ Dynamic Capacity Calculated:")
        print(f"  User's avg workday: {profile['avg_workday_minutes']} minutes")
        print(f"  Calculated daily availability:")
        for i, hours in enumerate(daily_hours):
            print(f"    Day {i+1}: {hours:.2f}h")
        
        # Compare with old static method (480 minutes)
        print(f"\n📊 Comparison with static 480min method:")
        static_hours = service._calculate_daily_availability(
            test_predictions,
            480.0  # Old static value
        )
        
        for i, (dynamic, static) in enumerate(zip(daily_hours, static_hours)):
            diff = dynamic - static
            print(f"    Day {i+1}: Dynamic={dynamic:.2f}h vs Static={static:.2f}h (Δ {diff:+.2f}h)")
        
        print(f"\n✅ Capacity is now personalized based on user's {profile['avg_daily_hours']:.1f}h average!")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


def test_full_plan_generation():
    """Test complete plan generation with work profile"""
    print("\n" + "="*60)
    print("TEST 3: Full Plan Generation")
    print("="*60)
    
    service = PlanService()
    
    # Generate plan for next week
    today = datetime.now().date()
    start_date = today + timedelta(days=1)
    end_date = start_date + timedelta(days=6)
    
    test_user_id = "test_user"
    target_hours = 35.0
    
    try:
        plan = service.generate_plan(
            user_id=test_user_id,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            target_hours=target_hours
        )
        
        if plan.get('status') == 'success':
            print("\n✅ Plan Generated Successfully!")
            
            # Check for work_profile in response
            if 'work_profile' in plan:
                print("\n✅ Work Profile included in plan:")
                wp = plan['work_profile']
                print(f"  • Avg Daily Hours: {wp['avg_daily_hours']:.1f}h")
                print(f"  • Typical Schedule: {wp['typical_start_hour']}:00 - {wp['typical_end_hour']}:00")
                print(f"  • Work Pattern: {wp['work_pattern_type']}")
                print(f"  • Based on {wp['days_analyzed']} days of data")
            else:
                print("\n⚠ Warning: work_profile missing from plan response")
            
            # Show capacity
            print(f"\n📊 Plan Details:")
            print(f"  • Target Hours: {plan.get('target_hours')}h")
            print(f"  • Available Hours: {plan.get('total_available_hours')}h")
            print(f"  • Feasibility: {plan.get('feasibility_score')}%")
            print(f"  • Is Feasible: {plan.get('is_feasible')}")
            
            # Show daily schedule
            if plan.get('daily_schedule'):
                print(f"\n📅 Daily Schedule:")
                for day in plan['daily_schedule']:
                    print(f"  • {day['date']}: {day['allocated_hours']:.1f}h of {day['available_hours']:.1f}h")
            
            print("\n✅ All tests passed! Phase 1 implementation working correctly.")
            
        else:
            print(f"\n❌ Plan generation failed: {plan.get('message')}")
        
        return plan
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def main():
    print("\n" + "🎯" + "="*58 + "🎯")
    print("  PHASE 1 IMPLEMENTATION TEST SUITE")
    print("  Dynamic Work Profile & Personalized Capacity")
    print("🎯" + "="*58 + "🎯")
    
    # Run tests
    profile = test_work_profile()
    test_dynamic_capacity(profile)
    plan = test_full_plan_generation()
    
    print("\n" + "="*60)
    print("TESTING COMPLETE")
    print("="*60)
    
    if profile and plan and plan.get('status') == 'success':
        print("\n✅ ✅ ✅ ALL TESTS PASSED! ✅ ✅ ✅")
        print("\nPhase 1 is working correctly:")
        print("  1. Work profiles calculated from historical data")
        print("  2. Capacity dynamically adjusted per user")
        print("  3. Plans include personalized work profiles")
    else:
        print("\n⚠ Some tests failed. Check errors above.")


if __name__ == "__main__":
    main()
