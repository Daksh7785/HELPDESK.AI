import os
import boto3
import argparse
import logging
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_cost_alert(account_id: str, budget_name: str, amount: float, email: str):
    """
    Configure a cost alert budget for the AWS infrastructure.
    This creates a Monthly Cost Budget that alerts when actual or forecasted
    costs exceed 80% or 100% of the budgeted amount.
    """
    try:
        client = boto3.client('budgets')
        
        logger.info(f"Configuring AWS cost alert budget '{budget_name}' for account {account_id} with limit ${amount}")
        
        response = client.create_budget(
            AccountId=account_id,
            Budget={
                'BudgetName': budget_name,
                'BudgetLimit': {
                    'Amount': str(amount),
                    'Unit': 'USD'
                },
                'CostTypes': {
                    'IncludeTax': True,
                    'IncludeSubscription': True,
                    'UseBlended': False,
                    'IncludeRefund': False,
                    'IncludeCredit': False,
                    'IncludeUpfront': True,
                    'IncludeRecurring': True,
                    'IncludeOtherSubscription': True,
                    'IncludeSupport': True,
                    'IncludeDiscount': True,
                    'UseAmortized': False
                },
                'TimeUnit': 'MONTHLY',
                'BudgetType': 'COST'
            },
            NotificationsWithSubscribers=[
                {
                    'Notification': {
                        'NotificationType': 'ACTUAL',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 80.0,
                        'ThresholdType': 'PERCENTAGE',
                        'NotificationState': 'ALARM'
                    },
                    'Subscribers': [
                        {
                            'SubscriptionType': 'EMAIL',
                            'Address': email
                        }
                    ]
                },
                {
                    'Notification': {
                        'NotificationType': 'ACTUAL',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 100.0,
                        'ThresholdType': 'PERCENTAGE',
                        'NotificationState': 'ALARM'
                    },
                    'Subscribers': [
                        {
                            'SubscriptionType': 'EMAIL',
                            'Address': email
                        }
                    ]
                },
                {
                    'Notification': {
                        'NotificationType': 'FORECASTED',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 100.0,
                        'ThresholdType': 'PERCENTAGE',
                        'NotificationState': 'ALARM'
                    },
                    'Subscribers': [
                        {
                            'SubscriptionType': 'EMAIL',
                            'Address': email
                        }
                    ]
                }
            ]
        )
        logger.info("Successfully configured cost alerts for cloud infrastructure.")
        return response
    except ClientError as e:
        logger.error(f"Failed to create budget: {e}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Configure cost alerts for cloud infrastructure (AWS)")
    parser.add_argument("--account-id", type=str, required=True, help="AWS Account ID")
    parser.add_argument("--budget-name", type=str, default="HelpdeskAI-Cloud-Cost-Alert", help="Name of the budget")
    parser.add_argument("--amount", type=float, required=True, help="Budget limit amount in USD")
    parser.add_argument("--email", type=str, required=True, help="Email address to receive cost alerts")
    
    args = parser.parse_args()
    
    # Require AWS credentials to be available in the environment
    if not os.environ.get("AWS_ACCESS_KEY_ID") or not os.environ.get("AWS_SECRET_ACCESS_KEY"):
        logger.warning("AWS credentials not found in environment. Please ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set.")
        
    create_cost_alert(args.account_id, args.budget_name, args.amount, args.email)
