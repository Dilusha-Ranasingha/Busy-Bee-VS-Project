"""Quick test to verify ML service components"""
import sys
print("Testing imports...")

try:
    print("✓ Flask", end=" ")
    from flask import Flask
    print("✓")
    
    print("✓ Database", end=" ")
    from config.database import get_session
    print("✓")
    
    print("✓ Pandas", end=" ")
    import pandas as pd
    print("✓")
    
    print("✓ XGBoost", end=" ")
    import xgboost as xgb
    print("✓")
    
    print("✓ Scikit-learn", end=" ")
    from sklearn.model_selection import TimeSeriesSplit
    print("✓")
    
    print("\n✅ All components ready!")
    print("\nYou can now run: python app.py")
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    sys.exit(1)
