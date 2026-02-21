## PAYSATCK DISPUTES:{
    "status": true,
    "message": "Disputes retrieved",
    "data": [],
    "meta": {
        "total": 0,
        "skipped": 0,
        "perPage": 50,
        "page": 1,
        "pageCount": 0
    }
}

## FEATURE FLAG
{
    "status": true,
    "message": "Features flags retrieved",
    "data": {
        "dash_next_enabled": false,
        "corporate_cards_enabled": false,
        "issuing_enabled": false,
        "debit_orders_enabled": false,
        "onboarding_v3_enabled": false,
        "ip_whitelist_enabled": true,
        "pod_enabled": true,
        "saved_cards_enabled": false,
        "preauthorization_enabled": false,
        "offline_topup_enabled": false,
        "dedicated_virtual_account_enabled": false,
        "is_subaccount_verification_feature_enabled": true,
        "virtual_terminal_enabled": true,
        "virtual_terminal_currency_select_enabled": false,
        "virtual_terminal_custom_fields_enabled": false,
        "direct_debit_enabled": true,
        "auto_top_up_enabled": true
    }
}

### PAYSTACK KEYS
GET https://api.paystack.co/integration/keys
{
    "status": true,
    "message": "Integration API keys retrieved",
    "data": [
        {
            "id": 3374968,
            "key": "sk_test_ee334c40a25b501851f5a52568673e2d1295a138",
            "domain": "test",
            "type": "secret"
        },
        {
            "id": 3374969,
            "key": "pk_test_6309cf911f31789d5f90e113c65d334307749df2",
            "domain": "test",
            "type": "public"
        }
    ]
}

## PAYSTACK REFERSH TOKEN
{
    "status": true,
    "message": "Token refreshed",
    "data": {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NTk1NzMwOCwicmVmcmVzaENvdW50IjoxLCJmaXJzdElzc3VlZEF0IjoxNzcxMjI5MzM3LCJzc29Mb2dpbiI6ZmFsc2UsImp0aSI6IjY5OTMyMmQ0YmVlZjFiYzU1MTZjM2QyYyIsImlhdCI6MTc3MTI1MDM4OCwibmJmIjoxNzcxMjUwMzg4LCJleHAiOjE3NzEzMzY3ODh9.C--2pMpXCbqB7zwC3m5U5ozH80Z2XaYBVIU1DfJH7d4",
        "expiry": 1771336788,
        "user": {
            "integrations": [],
            "email": "victoressienscript@gmail.com",
            "first_name": "Victor",
            "last_name": "Essien",
            "phone": "7065819849",
            "area_code": "0",
            "calling_code": "+234",
            "registration_complete": true,
            "last_login": "2026-02-16T13:59:48.000Z",
            "wt_access": "none",
            "is_developer": true,
            "job_title": "",
            "truecaller_verified": false,
            "drip_tag": "merchant - nigeria",
            "created_from": null,
            "mfa_enabled": false,
            "email_verified": true,
            "id": 5957308,
            "invited_by": null,
            "current_integration": 1438806,
            "passwordLastResetAt": null,
            "createdAt": "2025-04-28T13:13:30.000Z",
            "updatedAt": "2026-02-16T13:59:48.000Z",
            "show_mfa_feature": true
        }
    }
}


## PAYTSACK SESSION

{
    "status": true,
    "message": "Session retrieved",
    "data": {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NTk1NzMwOCwic3NvTG9naW4iOmZhbHNlLCJqdGkiOiI2OTkyZDA5OTUyYjk1NjgxNzJmZjFhMmUiLCJpYXQiOjE3NzEyMjkzMzcsIm5iZiI6MTc3MTIyOTMzNywiZXhwIjoxNzcxMzE1NzM3fQ.3NEz72ydpC4jXMFr6Eu9Ig7JcrnUWPN69mDeiPt8Mjo",
        "expiry": 1771315737,
        "user": {
            "integrations": [
                {
                    "business_name": "Victor",
                    "business_type": "starter",
                    "short_name": null,
                    "id": 1438806,
                    "logged_in_user_role": {
                        "id": 34,
                        "name": "admin",
                        "description": "This role grants users the permissions to manage everything on the dashboard"
                    },
                    "country_code": "NG",
                    "country": 1,
                    "sso_enabled": false,
                    "mfa": {
                        "is_required": false,
                        "enforcement_deadline": null
                    }
                }
            ],
            "email": "victoressienscript@gmail.com",
            "first_name": "Victor",
            "last_name": "Essien",
            "phone": "7065819849",
            "area_code": "0",
            "calling_code": "+234",
            "registration_complete": true,
            "last_login": "2026-02-16T08:08:25.000Z",
            "wt_access": "none",
            "is_developer": true,
            "job_title": "",
            "truecaller_verified": false,
            "drip_tag": "merchant - nigeria",
            "created_from": null,
            "mfa_enabled": false,
            "email_verified": true,
            "id": 5957308,
            "invited_by": null,
            "current_integration": 1438806,
            "passwordLastResetAt": null,
            "createdAt": "2025-04-28T13:13:30.000Z",
            "updatedAt": "2026-02-16T08:08:25.000Z",
            "is_enterprise_admin": false,
            "is_sso_user": false,
            "display_state": "test",
            "role": {
                "value": 1829587348619263,
                "name": "admin",
                "description": "This role grants users the permissions to manage everything on the dashboard",
                "integration": 0,
                "service": "dashboard",
                "id": 34,
                "organization": 1,
                "createdAt": "2018-05-10T23:40:26.000Z",
                "updatedAt": "2018-09-12T17:28:31.000Z",
                "is_custom": false
            },
            "permissions": [
                "api-key-*",
                "api-key-view",
                "user-view",
                "user-*",
                "metrics-*",
                "settings-*",
                "settings-view",
                "transaction-view",
                "transaction-export",
                "transaction-dispute",
                "customer-view",
                "customer-add",
                "customer-*",
                "transfer-view",
                "transfer-*",
                "transfer-export",
                "balance-view",
                "balance-export",
                "page-view",
                "page-*",
                "plan-view",
                "plan-*",
                "settlement-view",
                "settlement-export",
                "paymentrequest-view",
                "paymentrequest-*",
                "subaccount-*",
                "subaccount-view",
                "user-add",
                "customer-insights",
                "accounts-*",
                "accounts-view",
                "directdebit-*",
                "charge-*",
                "request-payout",
                "product-view",
                "product-*",
                "pos-terminal-*",
                "applepay-*",
                "refund-pwt",
                "corporate-cards-*",
                "corporate-cards-view",
                "issuing-*",
                "issuing-view",
                "connect-*",
                "directdebit-view"
            ],
            "show_mfa_feature": true,
            "dashboard_preferences": {
                "pagination": {
                    "use_cursor": true
                },
                "timezone": "UTC"
            }
        }
    }
}