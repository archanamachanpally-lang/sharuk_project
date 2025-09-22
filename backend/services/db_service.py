from sqlalchemy.orm import Session
from models import SprintPlan, RiskAssessment
from typing import Dict, Any, List

class DBService:
    def __init__(self):
        pass
    
    def save_sprint_plan(self, db: Session, user_inputs: Dict[str, Any], user_email: str) -> Dict[str, Any]:
        """Save a sprint plan to database"""
        try:
            print(f"💾 [DB SERVICE] Saving sprint plan with word_document: {len(user_inputs.get('word_document', ''))} characters")
            print(f"💾 [DB SERVICE] Word document preview: {user_inputs.get('word_document', '')[:100]}...")
            # Create new SprintPlan instance
            sprint_plan = SprintPlan(
                # I. Sprint Overview & Proposed Goal
                sprint_number=user_inputs.get('sprint_number'),
                sprint_dates=user_inputs.get('sprint_dates'),
                sprint_duration=user_inputs.get('sprint_duration'),
                team_name=user_inputs.get('team_name'),
                sprint_goal=user_inputs.get('sprint_goal'),
                
                # II. Team Capacity & Availability
                total_hours_per_person=user_inputs.get('total_hours_per_person'),
                number_of_members=user_inputs.get('number_of_members'),
                team_members=user_inputs.get('team_members'),
                historical_story_points=user_inputs.get('historical_story_points'),
                
                # III. Prioritized Product Backlog Items
                backlog_items=user_inputs.get('backlog_items'),
                
                # IV. Definition of Done (DoD)
                definition_of_done=user_inputs.get('definition_of_done'),
                
                # V. Known Impediments, Dependencies & Risks
                risks_and_impediments=user_inputs.get('risks_and_impediments'),
                
                # Generated Plan
                generated_plan=user_inputs.get('generated_plan'),
                
                # Word Document (replica of HTML rendered output)
                word_document=user_inputs.get('word_document'),
                
                # User who created this plan
                created_by=user_email
                
                # PDF generation is now handled by frontend html2pdf.js
                ,
                # Optional SOW content
                sow_content=user_inputs.get('sow_content')
            )
            
            # Add to database
            db.add(sprint_plan)
            db.commit()
            db.refresh(sprint_plan)
            
            return {"success": True, "message": "Sprint plan saved to database successfully", "plan_id": sprint_plan.id}
        except Exception as e:
            db.rollback()
            return {"success": False, "message": f"Failed to save sprint plan to database: {str(e)}"}
    
    def get_all_sprint_plans(self, db: Session) -> Dict[str, Any]:
        """Get all sprint plans from database"""
        try:
            plans = db.query(SprintPlan).order_by(SprintPlan.created_at.desc()).all()
            
            # Convert to dictionary format
            plans_data = []
            for plan in plans:
                print(f"📖 [DB SERVICE] Retrieving plan {plan.id} with word_document: {len(plan.word_document or '')} characters")
                plan_dict = {
                    "id": plan.id,
                    # I. Sprint Overview & Proposed Goal
                    "sprint_number": plan.sprint_number,
                    "sprint_dates": plan.sprint_dates,
                    "sprint_duration": plan.sprint_duration,
                    "team_name": plan.team_name,
                    "sprint_goal": plan.sprint_goal,
                    
                    # II. Team Capacity & Availability
                    "total_hours_per_person": plan.total_hours_per_person,
                    "number_of_members": plan.number_of_members,
                    "team_members": plan.team_members,
                    "historical_story_points": plan.historical_story_points,
                    
                    # III. Prioritized Product Backlog Items
                    "backlog_items": plan.backlog_items,
                    
                    # IV. Definition of Done (DoD)
                    "definition_of_done": plan.definition_of_done,
                    
                    # V. Known Impediments, Dependencies & Risks
                    "risks_and_impediments": plan.risks_and_impediments,
                    
                    # Generated Plan
                    "generated_plan": plan.generated_plan,
                    
                    # Word Document
                    "word_document": plan.word_document,
                    
                    # User who created this plan
                    "created_by": plan.created_by,
                    
                    # PDF generation is now handled by frontend html2pdf.js
                    
                    # Timestamps
                    "created_at": plan.created_at.isoformat() if plan.created_at else None
                }
                plans_data.append(plan_dict)
            
            return {"success": True, "plans": plans_data}
        except Exception as e:
            return {"success": False, "message": f"Failed to read sprint plans from database: {str(e)}"}
    
    def get_sprint_plans_by_user(self, db: Session, user_email: str) -> Dict[str, Any]:
        """Get sprint plans created by a specific user"""
        try:
            plans = db.query(SprintPlan).filter(SprintPlan.created_by == user_email).order_by(SprintPlan.created_at.desc()).all()
            
            # Convert to dictionary format
            plans_data = []
            for plan in plans:
                print(f"📖 [DB SERVICE] Retrieving user plan {plan.id} with word_document: {len(plan.word_document or '')} characters")
                plan_dict = {
                    "id": plan.id,
                    # I. Sprint Overview & Proposed Goal
                    "sprint_number": plan.sprint_number,
                    "sprint_dates": plan.sprint_dates,
                    "sprint_duration": plan.sprint_duration,
                    "team_name": plan.team_name,
                    "sprint_goal": plan.sprint_goal,
                    
                    # II. Team Capacity & Availability
                    "total_hours_per_person": plan.total_hours_per_person,
                    "number_of_members": plan.number_of_members,
                    "team_members": plan.team_members,
                    "historical_story_points": plan.historical_story_points,
                    
                    # III. Prioritized Product Backlog Items
                    "backlog_items": plan.backlog_items,
                    
                    # IV. Definition of Done (DoD)
                    "definition_of_done": plan.definition_of_done,
                    
                    # V. Known Impediments, Dependencies & Risks
                    "risks_and_impediments": plan.risks_and_impediments,
                    
                    # Generated Plan
                    "generated_plan": plan.generated_plan,
                    
                    # Word Document
                    "word_document": plan.word_document,
                    
                    # User who created this plan
                    "created_by": plan.created_by,
                    
                    # PDF generation is now handled by frontend html2pdf.js
                    
                    # Timestamps
                    "created_at": plan.created_at.isoformat() if plan.created_at else None
                }
                plans_data.append(plan_dict)
            
            return {"success": True, "plans": plans_data}
        except Exception as e:
            return {"success": False, "message": f"Failed to read sprint plans from database: {str(e)}"}
    
    def get_sprint_plan_by_id(self, db: Session, plan_id: int) -> Dict[str, Any]:
        """Get a specific sprint plan by ID from database"""
        try:
            plan = db.query(SprintPlan).filter(SprintPlan.id == plan_id).first()
            
            if plan:
                plan_dict = {
                    "id": plan.id,
                    # I. Sprint Overview & Proposed Goal
                    "sprint_number": plan.sprint_number,
                    "sprint_dates": plan.sprint_dates,
                    "sprint_duration": plan.sprint_duration,
                    "team_name": plan.team_name,
                    "sprint_goal": plan.sprint_goal,
                    
                    # II. Team Capacity & Availability
                    "total_hours_per_person": plan.total_hours_per_person,
                    "number_of_members": plan.number_of_members,
                    "team_members": plan.team_members,
                    "historical_story_points": plan.historical_story_points,
                    
                    # III. Prioritized Product Backlog Items
                    "backlog_items": plan.backlog_items,
                    
                    # IV. Definition of Done (DoD)
                    "definition_of_done": plan.definition_of_done,
                    
                    # V. Known Impediments, Dependencies & Risks
                    "risks_and_impediments": plan.risks_and_impediments,
                    
                    # Generated Plan
                    "generated_plan": plan.generated_plan,
                    
                    # Word Document
                    "word_document": plan.word_document,
                    
                    # User who created this plan
                    "created_by": plan.created_by,
                    
                    # PDF generation is now handled by frontend html2pdf.js
                    
                    # Timestamps
                    "created_at": plan.created_at.isoformat() if plan.created_at else None
                }
                return {"success": True, "plan": plan_dict}
            else:
                return {"success": False, "message": "Sprint plan not found"}
        except Exception as e:
            return {"success": False, "message": f"Failed to read sprint plan from database: {str(e)}"}
    
    def delete_sprint_plan(self, db: Session, plan_id: int, user_email: str) -> Dict[str, Any]:
        """Delete a sprint plan (only if user owns it)"""
        try:
            # Find the plan and verify ownership
            plan = db.query(SprintPlan).filter(
                SprintPlan.id == plan_id,
                SprintPlan.created_by == user_email
            ).first()
            
            if not plan:
                return {"success": False, "message": "Sprint plan not found or you don't have permission to delete it"}
            
            # Delete the plan
            db.delete(plan)
            db.commit()
            
            return {"success": True, "message": "Sprint plan deleted successfully"}
        except Exception as e:
            db.rollback()
            return {"success": False, "message": f"Failed to delete sprint plan: {str(e)}"}

    def find_and_delete_old_plan(self, db: Session, user_email: str, sprint_number: str, team_name: str) -> Dict[str, Any]:
        """Find and delete old plan with same sprint number and team name for the same user"""
        try:
            # Find plans with same sprint number and team name for the same user
            old_plans = db.query(SprintPlan).filter(
                SprintPlan.created_by == user_email,
                SprintPlan.sprint_number == sprint_number,
                SprintPlan.team_name == team_name
            ).all()
            
            if not old_plans:
                return {"success": True, "message": "No old plans found to replace", "deleted_count": 0}
            
            # Delete all old plans (should typically be just one)
            deleted_count = 0
            for old_plan in old_plans:
                db.delete(old_plan)
                deleted_count += 1
            
            db.commit()
            
            return {"success": True, "message": f"Replaced {deleted_count} old plan(s)", "deleted_count": deleted_count}
        except Exception as e:
            db.rollback()
            return {"success": False, "message": f"Failed to replace old plans: {str(e)}"}

    def save_risk_assessment(self, db: Session, user_inputs: Dict[str, Any], user_email: str) -> Dict[str, Any]:
        """Save a risk assessment to database"""
        try:
            # Create new RiskAssessment instance
            risk_assessment = RiskAssessment(
                # Risk Assessment Overview
                project_name=user_inputs.get('project_name'),
                project_dates=user_inputs.get('project_dates'),
                project_duration=user_inputs.get('project_duration'),
                team_name=user_inputs.get('team_name'),
                project_scope=user_inputs.get('project_scope'),
                
                # Risk Categories & Analysis
                risk_categories=user_inputs.get('risk_categories'),
                risk_mitigation=user_inputs.get('risk_mitigation'),
                risk_monitoring=user_inputs.get('risk_monitoring'),
                
                # Stakeholder Information
                stakeholders=user_inputs.get('stakeholders'),
                
                # Risk Assessment Details
                risk_matrix=user_inputs.get('risk_matrix'),
                risk_register=user_inputs.get('risk_register'),
                
                # Generated Assessment
                generated_assessment=user_inputs.get('generated_assessment'),
                
                # Word Document (replica of HTML rendered output)
                word_document=user_inputs.get('word_document'),
                
                # User who created this assessment
                created_by=user_email
            )
            
            # Add to database
            db.add(risk_assessment)
            db.commit()
            db.refresh(risk_assessment)
            
            return {"success": True, "message": "Risk assessment saved to database successfully", "assessment_id": risk_assessment.id}
        except Exception as e:
            db.rollback()
            return {"success": False, "message": f"Failed to save risk assessment to database: {str(e)}"}

    def get_all_risk_assessments(self, db: Session) -> Dict[str, Any]:
        """Get all risk assessments from database"""
        try:
            assessments = db.query(RiskAssessment).order_by(RiskAssessment.created_at.desc()).all()
            
            # Convert to dictionary format
            assessments_data = []
            for assessment in assessments:
                assessment_dict = {
                    "id": assessment.id,
                    "project_name": assessment.project_name,
                    "project_dates": assessment.project_dates,
                    "project_duration": assessment.project_duration,
                    "team_name": assessment.team_name,
                    "project_scope": assessment.project_scope,
                    "risk_categories": assessment.risk_categories,
                    "risk_mitigation": assessment.risk_mitigation,
                    "risk_monitoring": assessment.risk_monitoring,
                    "stakeholders": assessment.stakeholders,
                    "risk_matrix": assessment.risk_matrix,
                    "risk_register": assessment.risk_register,
                    "generated_assessment": assessment.generated_assessment,
                    "word_document": assessment.word_document,
                    "created_by": assessment.created_by,
                    "created_at": assessment.created_at.isoformat() if assessment.created_at else None
                }
                assessments_data.append(assessment_dict)
            
            return {"success": True, "assessments": assessments_data}
        except Exception as e:
            return {"success": False, "message": f"Failed to get risk assessments: {str(e)}"}

    def get_risk_assessments_by_user(self, db: Session, user_email: str) -> Dict[str, Any]:
        """Get risk assessments for a specific user"""
        try:
            assessments = db.query(RiskAssessment).filter(
                RiskAssessment.created_by == user_email
            ).order_by(RiskAssessment.created_at.desc()).all()
            
            # Convert to dictionary format
            assessments_data = []
            for assessment in assessments:
                assessment_dict = {
                    "id": assessment.id,
                    "project_name": assessment.project_name,
                    "project_dates": assessment.project_dates,
                    "project_duration": assessment.project_duration,
                    "team_name": assessment.team_name,
                    "project_scope": assessment.project_scope,
                    "risk_categories": assessment.risk_categories,
                    "risk_mitigation": assessment.risk_mitigation,
                    "risk_monitoring": assessment.risk_monitoring,
                    "stakeholders": assessment.stakeholders,
                    "risk_matrix": assessment.risk_matrix,
                    "risk_register": assessment.risk_register,
                    "generated_assessment": assessment.generated_assessment,
                    "word_document": assessment.word_document,
                    "created_by": assessment.created_by,
                    "created_at": assessment.created_at.isoformat() if assessment.created_at else None
                }
                assessments_data.append(assessment_dict)
            
            return {"success": True, "assessments": assessments_data}
        except Exception as e:
            return {"success": False, "message": f"Failed to get risk assessments for user: {str(e)}"}

    def get_risk_assessment_by_id(self, db: Session, assessment_id: int) -> Dict[str, Any]:
        """Get a specific risk assessment by ID"""
        try:
            assessment = db.query(RiskAssessment).filter(RiskAssessment.id == assessment_id).first()
            
            if not assessment:
                return {"success": False, "message": "Risk assessment not found"}
            
            assessment_dict = {
                "id": assessment.id,
                "project_name": assessment.project_name,
                "project_dates": assessment.project_dates,
                "project_duration": assessment.project_duration,
                "team_name": assessment.team_name,
                "project_scope": assessment.project_scope,
                "risk_categories": assessment.risk_categories,
                "risk_mitigation": assessment.risk_mitigation,
                "risk_monitoring": assessment.risk_monitoring,
                "stakeholders": assessment.stakeholders,
                "risk_matrix": assessment.risk_matrix,
                "risk_register": assessment.risk_register,
                "generated_assessment": assessment.generated_assessment,
                "word_document": assessment.word_document,
                "created_by": assessment.created_by,
                "created_at": assessment.created_at.isoformat() if assessment.created_at else None
            }
            
            return {"success": True, "assessment": assessment_dict}
        except Exception as e:
            return {"success": False, "message": f"Failed to get risk assessment: {str(e)}"}

    def delete_risk_assessment(self, db: Session, assessment_id: int, user_email: str) -> Dict[str, Any]:
        """Delete a risk assessment (only if user owns it)"""
        try:
            assessment = db.query(RiskAssessment).filter(
                RiskAssessment.id == assessment_id,
                RiskAssessment.created_by == user_email
            ).first()
            
            if not assessment:
                return {"success": False, "message": "Risk assessment not found or you don't have permission to delete it"}
            
            db.delete(assessment)
            db.commit()
            
            return {"success": True, "message": "Risk assessment deleted successfully"}
        except Exception as e:
            db.rollback()
            return {"success": False, "message": f"Failed to delete risk assessment: {str(e)}"}


db_service = DBService()
