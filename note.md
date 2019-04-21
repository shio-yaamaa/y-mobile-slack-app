# Event Triggers

- `fetch`: Hourly
- `generate-chart-url`: Daily
- `notify`: After `generate-chart-url`

# Example of QuickChart config

## Mixed Chart Types

```javascript
const c = {
  type: "bar",
  data: {
    labels: ["January", "February", "March", "April", "May"],
    datasets: [
      {
        label: "Dogs",
        data: [50, 60, 70, 180, 190]
      },
      {
        label: "Cats",
        data: [100, 200, 300, 400, 500]
      },
      {
        type: "line",
        fill: false,
        label: "Potatoes",
        data: [100, 400, 200, 400, 700]
      }
    ]
  }
};
```

# Table Schema

```javascript
{
  pk: 'user',
  sk: '0000', // User ID
  slackWebhookUrl: 'https://...',
  msn: '...',
  password: '...',
},
...
{
  pk: 'month-201904',
  sk: '0000', // Corresponds to the user's SK
  records: [
    {
      date: 1,
      hour: 0,
      data: whatever
    },
    ...
  ],
},
...
```