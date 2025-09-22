import csv
import os
from datetime import datetime
from typing import List, Dict, Any

class CSVService:
    def __init__(self):
        self.csv_file = "sprint_plans.csv"
        self.columns = [
            "sprint_number", "sprint_dates", "sprint_duration", "team_name", "sprint_goal",
            "working_hours_per_person", "team_member_availability", "historical_story_points",
            "pbi_summary", "pbi_criteria", "pbi_priority", "pbi_effort",
            "definition_of_done", "risks_and_dependencies", "created_at"
        ]
        self._ensure_csv_exists()
    
    def _ensure_csv_exists(self):
        """Create CSV file with headers if it doesn't exist"""
        if not os.path.exists(self.csv_file):
            with open(self.csv_file, 'w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.columns)
                writer.writeheader()
    
    def save_sprint_plan(self, user_inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Save a sprint plan to CSV"""
        try:
            print(f"Saving sprint plan with inputs: {user_inputs}")
            # Add timestamp
            user_inputs['created_at'] = datetime.now().isoformat()
            
            # Ensure all columns exist
            for col in self.columns:
                if col not in user_inputs:
                    user_inputs[col] = ""
            
            print(f"Final user_inputs: {user_inputs}")
            print(f"CSV file path: {os.path.abspath(self.csv_file)}")
            
            with open(self.csv_file, 'a', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=self.columns)
                writer.writerow(user_inputs)
            
            print(f"Sprint plan saved successfully to {self.csv_file}")
            return {"success": True, "message": "Sprint plan saved successfully"}
        except Exception as e:
            print(f"Error saving sprint plan: {str(e)}")
            return {"success": False, "message": f"Failed to save sprint plan: {str(e)}"}
    
    def get_all_sprint_plans(self) -> Dict[str, Any]:
        """Get all sprint plans from CSV"""
        try:
            print(f"Getting all sprint plans from {self.csv_file}")
            print(f"File exists: {os.path.exists(self.csv_file)}")
            plans = []
            if os.path.exists(self.csv_file):
                with open(self.csv_file, 'r', newline='', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        plans.append(row)
                        print(f"Found plan: {row}")
            
            print(f"Total plans found: {len(plans)}")
            return {"success": True, "plans": plans}
        except Exception as e:
            print(f"Error reading sprint plans: {str(e)}")
            return {"success": False, "message": f"Failed to read sprint plans: {str(e)}"}
    
    def get_sprint_plan_by_id(self, plan_id: int) -> Dict[str, Any]:
        """Get a specific sprint plan by index"""
        try:
            plans = []
            if os.path.exists(self.csv_file):
                with open(self.csv_file, 'r', newline='', encoding='utf-8') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        plans.append(row)
            
            if 0 <= plan_id < len(plans):
                return {"success": True, "plan": plans[plan_id]}
            else:
                return {"success": False, "message": "Sprint plan not found"}
        except Exception as e:
            return {"success": False, "message": f"Failed to read sprint plan: {str(e)}"}

csv_service = CSVService() 