# Car Rental System

A car rental web app with two kinds of users: the admin (the rental office) and customers.

## How to open it

1. Unzip the folder.
2. Double-click `index.html`. It opens in your web browser (Chrome, Edge, Firefox or Safari).

No installation or internet connection is needed, except to load the font. Without internet, the page uses your computer's standard font.

## Logins

There is one login page for everyone. Click **Log in** at the top.

| Who      | Username                   | Password                                  |
|----------|----------------------------|-------------------------------------------|
| Admin    | `admin1`                   | `admin123`                                |
| Customer | Their full name, e.g. `Juan Dela Cruz` | Last 4 digits of their mobile number, e.g. `4567` for 0917 123 4567 |

The admin can change the admin username and password: **Settings → Change admin login**.

## What customers can do

- See the dashboard: all cars, prices, and photos of renters posted by the admin.
- Set pickup and return dates to see which cars are free and the total price.
- Book a car in 3 steps: dates and extras → personal details (full name, mobile number, address, driver's license) → check and send.
- Log in after booking to see **My bookings**, with the status of each one: Requested, Approved, Picked up, Returned.
- Read comments from the office and chat with the office in **Messages**.
- Cancel a booking up to **2 days before pickup** (the admin can change the number of days in Settings). The rule is shown before they send a booking and on every booking, with the exact last day to cancel. After that, they message the office.
- Update their own details in **My details**: full name, mobile number, email, address, driver's license and emergency contact. Regular customers don't need to type them again: the next booking form fills in by itself. If they change their name or mobile number, their login changes too (the page tells them the new password before they save), and their bookings and messages stay with them.

## What the admin can do

- **Rentals**: see every booking with the customer's details. Approve or reject new requests, mark a car picked up or returned, and write a comment or suggestion that the customer sees.
- **Change booking**: when a customer changes their mind, open the booking and click *Change booking* to move the dates, switch the car, or change pickup/delivery and extras. The total is recalculated (same car keeps the price they booked at), a clash with another booking is flagged, the change is recorded on the booking, and the customer can be told automatically in Messages. The admin can cancel at any time.
- **Customers**: list of everyone who has rented, with contact details, number of rentals and total spent. Customers with 3 or more bookings are marked *Regular*.
- **Messages**: chat with any customer.
- **Fleet**: add cars, delete cars, change the price, photo and every other detail, or mark a car under maintenance or hidden.
- **Drivers**: add, edit or delete drivers (name, mobile, license, photo, notes, available or off duty). When a customer books an extra that includes a driver, the booking shows *Needs a driver*: open it and pick a driver. The customer sees the driver's name and number on their booking and gets a message. Each driver shows their upcoming trips, and you're warned if a driver is already busy at that time.
- **Settings**: edit the extras customers can add (name, price per day, whether it includes a driver; add or remove extras), the delivery fee, and how many days before pickup customers can cancel. Changes apply to new bookings; existing bookings keep their price.
- **Renter photos**: upload photos that appear on every customer's dashboard.
- **Customer view**: see the site the way customers see it.

## Where the data is saved

When opened from this folder, everything (cars, bookings, photos, messages, the admin login) is saved in **this browser on this computer only**. Admin and customers must use the same computer and browser. Clearing the browser's site data erases it.

- Use reasonably small photos: the browser has limited storage space (about 5 MB). The app shrinks photos automatically.
- It starts with 6 sample cars. Their prices and plate numbers are examples: edit or delete them in **Fleet**.

For real customers on their own phones, use the online version, where everyone shares the same data.

## Files

```
car-rental-system/
├── index.html      the page
├── css/style.css   colours, layout and fonts
├── js/app.js       everything the app does
└── README.md       this file
```

## Note on security

The logins in this version run in the browser and are meant for a demo or school project. A 4-digit password is easy to guess. A real business would need a server that checks passwords.
