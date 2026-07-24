{
  "tenantName": "Harbor Peak Logistics",
  "tenantDomain": "harborpeaklogistics.onmicrosoft.com",
  "reportGenerated": "2026-07-18",
  "overview": {
    "usersAnalyzed": 210,
    "adminRolesDetected": 3,
    "conditionalAccessPolicies": 0
  },
  "signals": [
    {
      "control": "Legacy Authentication",
      "status": "good",
      "message": "No legacy authentication activity detected"
    },
    {
      "control": "Privileged Role MFA",
      "status": "warning",
      "message": "Some privileged roles do not have MFA configured"
    },
    {
      "control": "Privileged Role Count",
      "status": "good",
      "message": "3 privileged roles detected"
    },
    {
      "control": "Conditional Access Policies",
      "status": "warning",
      "message": "No conditional access policies configured"
    },
    {
      "control": "Conditional Access Exclusions",
      "status": "good",
      "message": "No conditional access exclusions detected"
    },
    {
      "control": "EDR Adoption Rate",
      "status": "warning",
      "message": "72% of endpoints have EDR deployed",
      "tier": "Weak"
    },
    {
      "control": "EDR Exclusions",
      "status": "good",
      "message": "No EDR exclusions detected",
      "tier": "Strong"
    },
    {
      "control": "EDR Definition Currency",
      "status": "warning",
      "message": "Definitions last updated 52 days ago",
      "tier": "Weak"
    },
    {
      "control": "Security Awareness Training",
      "status": "good",
      "severity": "Low",
      "message": "Training document present"
    }
  ],
  "insuranceSignals": [
    {
      "control": "Legacy Authentication",
      "riskCategory": "Credential Compromise",
      "claimExposure": [
        "Account Takeover",
        "Data Breach"
      ]
    },
    {
      "control": "Privileged Role MFA",
      "riskCategory": "Identity Compromise",
      "claimExposure": [
        "Ransomware",
        "Business Interruption"
      ]
    },
    {
      "control": "Privileged Role Count",
      "riskCategory": "Privilege Escalation",
      "claimExposure": [
        "Data Breach",
        "Unauthorized Access"
      ]
    },
    {
      "control": "Conditional Access Policies",
      "riskCategory": "Access Control Weakness",
      "claimExposure": [
        "Unauthorized Access"
      ]
    },
    {
      "control": "Conditional Access Exclusions",
      "riskCategory": "Control Bypass",
      "claimExposure": [
        "Data Exfiltration",
        "Account Takeover"
      ]
    },
    {
      "control": "EDR Adoption Rate",
      "riskCategory": "Malware Execution",
      "claimExposure": [
        "Ransomware",
        "Business Interruption"
      ]
    },
    {
      "control": "EDR Exclusions",
      "riskCategory": "Control Bypass",
      "claimExposure": [
        "Data Exfiltration",
        "Ransomware"
      ]
    },
    {
      "control": "EDR Definition Currency",
      "riskCategory": "Malware Execution",
      "claimExposure": [
        "Ransomware"
      ]
    },
    {
      "control": "Security Awareness Training",
      "riskCategory": "Social Engineering Risk",
      "claimExposure": [
        "Business Email Compromise",
        "Funds Transfer Fraud"
      ]
    }
  ],
  "riskScore": 30,
  "lossRatio": {
    "range": "90%+",
    "rating": "Adverse"
  },
  "aiSummary": "Adverse risk posture (30/100) driven by: Some privileged roles do not have MFA configured; No conditional access policies configured; only 72% EDR adoption; EDR definitions 52 days out of date. Expected loss ratio 90%+. Recommend decline or substantial remediation before consideration."
}
