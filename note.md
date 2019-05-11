# Event Triggers

- `fetch`: Hourly
- `notify`: Daily

# Table Schema

```javascript
{
  pk: 'user',
  sk: '0000', // User ID
  slackWebhookUrl: 'https://...',
  ymobileCredential: {
    msn: '...',
    password: '...',
  },
},
...
{
  pk: 'month-201904',
  sk: '0000', // Corresponds to the user's SK
  records: [
    {
      hour: {
        date: number,
        hour: number,
      },
      dataUsageAmounts: {
        capacity: number,
        current: number,
      },
    },
    ...
  ],
},
...
```