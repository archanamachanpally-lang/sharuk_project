from schemas import GrokSummarizeRequest, GrokSummarizeResponse
import random

class GrokService:
    def __init__(self):
        self.template_summaries = [
            "Based on your responses, here's your sprint plan:",
            "Here's a summary of your sprint planning session:",
            "Your sprint planning summary:",
            "Based on our conversation, here's your sprint plan:"
        ]
    
    def summarize(self, request: dict) -> dict:
        """Mock Grok summarization that generates realistic sprint planning summaries"""
        try:
            responses = request.get("responses", [])
            user_info = request.get("user_info", {})
            
            # Extract user responses
            user_responses = [r for r in responses if r.get("type") == "user"]
            
            # Generate summary based on responses
            summary = self._generate_summary(user_responses)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(user_responses)
            
            # Estimate duration
            estimated_duration = self._estimate_duration(user_responses)
            
            # Identify priority items
            priority_items = self._identify_priorities(user_responses)
            
            return {
                "summary": summary,
                "recommendations": recommendations,
                "estimated_duration": estimated_duration,
                "priority_items": priority_items
            }
            
        except Exception as e:
            return {
                "summary": f"Error generating summary: {str(e)}",
                "recommendations": ["Please try again"],
                "estimated_duration": "Unknown",
                "priority_items": []
            }
    
    def _generate_summary(self, user_responses: list) -> str:
        """Generate a comprehensive sprint planning summary"""
        if not user_responses:
            return "No responses provided for summarization."
        
        # Extract key information
        user_name = self._extract_user_name(user_responses)
        project_name = self._extract_project_name(user_responses)
        goals = self._extract_goals(user_responses)
        team_size = self._extract_team_size(user_responses)
        duration = self._extract_duration(user_responses)
        challenges = self._extract_challenges(user_responses)
        
        summary_parts = []
        
        # Add greeting
        if user_name:
            summary_parts.append(f"Hello {user_name}!")
        
        # Add project information
        if project_name:
            summary_parts.append(f"Your project '{project_name}' is well-defined for this sprint.")
        
        # Add goals
        if goals:
            summary_parts.append(f"Key goals identified: {goals}")
        
        # Add team information
        if team_size:
            summary_parts.append(f"Team size: {team_size} members")
        
        # Add duration
        if duration:
            summary_parts.append(f"Sprint duration: {duration}")
        
        # Add challenges
        if challenges:
            summary_parts.append(f"Anticipated challenges: {challenges}")
        
        # Add closing
        summary_parts.append("This sprint plan provides a solid foundation for successful project execution.")
        
        return " ".join(summary_parts)
    
    def _generate_recommendations(self, user_responses: list) -> list:
        """Generate recommendations based on user responses"""
        recommendations = [
            "Set up daily standup meetings",
            "Create a detailed task breakdown",
            "Establish clear communication channels",
            "Define success metrics for each goal"
        ]
        
        # Add context-specific recommendations
        for response in user_responses:
            message = response.get("message", "").lower()
            if "challenge" in message or "difficulty" in message:
                recommendations.append("Schedule regular risk assessment meetings")
            if "team" in message and ("large" in message or "many" in message):
                recommendations.append("Consider breaking into smaller sub-teams")
            if "resource" in message:
                recommendations.append("Create a resource allocation plan")
        
        return recommendations[:5]  # Limit to 5 recommendations
    
    def _estimate_duration(self, user_responses: list) -> str:
        """Estimate sprint duration based on responses"""
        for response in user_responses:
            message = response.get("message", "").lower()
            if "2 week" in message or "two week" in message:
                return "2 weeks"
            elif "3 week" in message or "three week" in message:
                return "3 weeks"
            elif "4 week" in message or "four week" in message:
                return "4 weeks"
            elif "1 week" in message or "one week" in message:
                return "1 week"
        
        return "2 weeks (default)"
    
    def _identify_priorities(self, user_responses: list) -> list:
        """Identify priority items from user responses"""
        priorities = []
        
        for response in user_responses:
            message = response.get("message", "").lower()
            if "goal" in message:
                priorities.append("Define and prioritize sprint goals")
            if "team" in message:
                priorities.append("Team coordination and communication")
            if "resource" in message:
                priorities.append("Resource allocation and management")
            if "challenge" in message:
                priorities.append("Risk mitigation strategies")
        
        if not priorities:
            priorities = ["Sprint goal definition", "Team alignment", "Resource planning"]
        
        return priorities[:3]  # Limit to 3 priorities
    
    def _extract_user_name(self, responses: list) -> str:
        """Extract user name from responses"""
        for response in responses:
            message = response.get("message", "").lower()
            if "my name is" in message:
                name_part = message.split("my name is")[-1].strip()
                if name_part:
                    return name_part.split()[0].title()
        return ""
    
    def _extract_project_name(self, responses: list) -> str:
        """Extract project name from responses"""
        for response in responses:
            message = response.get("message", "").lower()
            if "project" in message:
                # Extract project name after "project"
                project_part = message.split("project")[-1].strip()
                if project_part:
                    return project_part.split()[0].title()
        return "Sprint Project"
    
    def _extract_goals(self, responses: list) -> str:
        """Extract goals from responses"""
        goals = []
        for response in responses:
            message = response.get("message", "").lower()
            if "goal" in message:
                goals.append(response.get("message", ""))
        return "; ".join(goals) if goals else "Sprint objectives"
    
    def _extract_team_size(self, responses: list) -> str:
        """Extract team size from responses"""
        for response in responses:
            message = response.get("message", "").lower()
            if any(word in message for word in ["team", "member", "people"]):
                return response.get("message", "")
        return "Team size not specified"
    
    def _extract_duration(self, responses: list) -> str:
        """Extract duration from responses"""
        for response in responses:
            message = response.get("message", "").lower()
            if any(word in message for word in ["week", "duration", "time"]):
                return response.get("message", "")
        return "Duration not specified"
    
    def _extract_challenges(self, responses: list) -> str:
        """Extract challenges from responses"""
        challenges = []
        for response in responses:
            message = response.get("message", "").lower()
            if any(word in message for word in ["challenge", "difficulty", "problem"]):
                challenges.append(response.get("message", ""))
        return "; ".join(challenges) if challenges else "No specific challenges identified"

grok_service = GrokService() 