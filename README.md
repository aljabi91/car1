# Car Rental System

A car rental web app with two kinds of users: the admin (the rental office) and customers.

All data is saved on a server, not in the browser: cars, photos, renters, bookings, drivers, messages, settings and the admin login. Any phone or laptop that opens the system sees the same information.

There are two ways to run it:

- **A. On Vercel (on the internet).** The data is saved in **Upstash Redis** and the photos in **Vercel Blob**, both added from your Vercel project. Vercel can't keep files that the app writes, so a `data` folder can't work there.
- **B. On your own computer.** The data is saved in the `data` folder, and phones on the same Wi-Fi can use it.

---

## A. Deploy on Vercel

### 1. Upload the new files

Replace your Vercel project's files with this whole folder (`api/`, `lib/`, `public/`, `vercel.json`, `package.json` and the rest), then deploy:

- If your project is linked to GitHub: commit and push the folder.
- If you use the Vercel CLI: run `vercel --prod` inside this folder.

`vercel.json` already tells Vercel to serve the `public` folder and send every `/api/...` request to `api/index.js`.

### 2. Connect the database (Upstash Redis)

1. In the Vercel dashboard, open your project and go to the **Storage** tab.
2. Choose **Upstash** (Redis) from the Marketplace and create a database.
3. Connect it to this project for **Production** (and Preview if you use it).

Vercel adds the connection settings to the project automatically. The app reads `KV_REST_API_URL` and `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### 3. Connect photo storage (Vercel Blob)

1. In the same **Storage** tab, create a **Blob** store with **public** access.
2. Connect it to this project. If you're asked, tick **Add a read-write token env var**, so the project gets `BLOB_READ_WRITE_TOKEN`.

### 4. Redeploy

Settings take effect on the next deployment. Go to **Deployments**, open the latest one, choose **Redeploy**, then open your site.

**Check it worked:** the yellow note "Running from the downloaded file…" must be gone. If the page says "The database is not connected yet", step 2 or 4 is missing. Then log in as admin, change a car's price, and open the site on a second phone: it shows the new price.

The first time the database is used, the app adds 6 sample cars. Edit or delete them in **Fleet**.

Changes made on one device appear on others within about 4 seconds.

Check Upstash's and Vercel's plan limits for your expected number of visitors.

---

## B. Run it on your own computer

1. Install **Node.js** (LTS) from https://nodejs.org. You only need to do this once.
2. Double-click `start-windows.bat` (Windows) or `start-mac.command` (Mac), or type `node run-local.js` in this folder.
3. The window shows the addresses to open:
   - `http://localhost:3000` on the same computer.
   - One like `http://192.168.1.23:3000` for phones and laptops **on the same Wi-Fi**.
4. Keep the window open while people use the system. The data stays saved in the `data` folder when you close it.

On Windows, click **Allow** if the firewall asks, so phones can connect. Back up by copying the `data` folder.

---

## Logins

There is one login page for everyone. Click **Log in** at the top.

| Who      | Username | Password |
|----------|----------|----------|
| Admin    | `admin1` | `admin123` |
| Customer | Their full name, e.g. `Juan Dela Cruz` | Last 4 digits of their mobile number, e.g. `4567` for 0917 123 4567 |

**Change the admin password** in **Settings → Change admin login** before real customers use the system.

Customers can log in on any device and see their bookings, messages and details.

## What customers can do

- See all cars, prices, and photos of renters posted by the admin.
- Pick dates to see which cars are free and the total price.
- Book in 3 steps: dates and extras → personal details → check and send.
- Log in to see **My bookings** with each booking's progress and assigned driver, read the office's comments, and chat in **Messages**.
- Edit their own details in **My details**.
- Cancel up to 2 days before pickup. The admin can change the number of days.

## What the admin can do

- **Rentals**: approve or reject requests, mark pickup and return, comment, and change bookings (dates, car, extras, driver).
- **Customers**: everyone who has rented, with contact details and totals.
- **Messages**: chat with customers.
- **Fleet**: add, edit or delete cars, prices and photos.
- **Drivers**: add, edit or delete drivers and assign them to bookings.
- **Renter photos**: photos shown on every customer's dashboard.
- **Settings**: extras and prices, delivery fee, cancellation rule, admin login.

## Files

```
car-rental-system/
├── public/              the app (index.html, css/style.css, js/app.js)
├── lib/core.js          shared rules: logins, who can change what, prices
├── api/index.js         the Vercel version: saves to Upstash Redis and Vercel Blob
├── vercel.json          Vercel settings
├── run-local.js         the computer version: saves to the data folder
├── start-windows.bat    starts the computer version on Windows
├── start-mac.command    starts the computer version on a Mac
├── package.json
└── README.md
```

## Security notes

- The server checks every change. Only the admin can change cars, prices, drivers, settings and other people's bookings. Customers only see their own bookings and messages, can cancel in time, and can edit their own contact details. Prices are worked out on the server, so a customer can't change what they pay.
- Customer passwords are only 4 digits. The server allows 10 login tries per minute from one address to slow down guessing.
- Photos in a public Blob store can be opened by anyone who has their link. Car and renter photos are meant to be public. Don't upload private documents.
