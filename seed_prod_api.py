
import urllib.request
import json
import time

projects = [
    {'title': 'Financial Modeling for Series A', 'description': 'Help us build a comprehensive financial model to present to investors for our upcoming Series A round. Need someone strong in Excel and corporate finance.', 'domain': 'Finance'},
    {'title': 'Market Entry Strategy for FinTech Startup', 'description': 'Analyze the SE Asian market for our new FinTech product. Focus on competitive analysis and regulatory landscape.', 'domain': 'Marketing'},
    {'title': 'Optimize Logistics Network', 'description': 'Looking for someone to help optimize our delivery routes and warehouse operations. Supply chain experience is a plus.', 'domain': 'Operations'},
    {'title': 'Customer Churn Prediction Model', 'description': 'Build an analytics dashboard to predict which customers are at risk of churning based on their platform usage patterns.', 'domain': 'Data Science & Analytics'},
    {'title': 'Q3 Digital Marketing Campaign', 'description': 'Lead the strategy and execution of our Q3 ad spend across Google and Meta. Need someone who understands ROAS and conversion tracking.', 'domain': 'Marketing'},
    {'title': 'Warehouse Inventory Optimization', 'description': 'Analyze our inventory turnover rates and propose a just-in-time inventory system to reduce holding costs.', 'domain': 'Operations'},
    {'title': 'M&A Target Screening', 'description': 'Help our corporate development team screen potential acquisition targets in the SaaS space. Need strong valuation skills.', 'domain': 'Finance'},
    {'title': 'A/B Testing Revenue Analytics', 'description': 'Analyze the results of our recent pricing page A/B tests to determine the statistically significant impact on LTV.', 'domain': 'Data Science & Analytics'},
]

for p in projects:
    req = urllib.request.Request(
        'https://api.placementmantra.shop/api/projects',
        data=json.dumps(p).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    success = False
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req) as response:
                print('Success:', p['title'])
                success = True
                break
        except Exception as e:
            print(f'Attempt {attempt+1} failed: {e}')
            if hasattr(e, 'read'):
                print(e.read().decode())
            time.sleep(2)
    if not success:
        print('Failed to add:', p['title'])
print('Done!')

