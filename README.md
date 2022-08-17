# expenseBot

Telegram Bot that take your expenses and store them in a Google Spreadsheet.

In the Google Spreadsheet there are also:
- the accesses of different users (the main user is cheked by telegram id);
- a table with the expense divided by category (in the first line the category names and in each column the expenses voices);
- a pivot table (structure in the image).

The first day of the month, the bot takes the information from the pivot table and create two types of chart.
The first with the total expense for every month.
The second with the expenses divided by category of the last six month.
Both chart are sended by the bot as a message.
