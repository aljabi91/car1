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

### 3. Connect photo storage (Vercel Blob), recommended

1. In your project, open **Storage** in the sidebar and select **Create Storage**, then choose **Blob**.
2. Select **Continue** and set the access to **Public**. Car photos, renter photos and the logo are shown to everyone. Driver's license photos are never stored here; they stay private in the database.
3. Give it a name, such as `car-rental-photos`.
4. Optional: tick **Add a read-write token env var to this connection**. The app works with or without it.
5. Select **Create**. Vercel connects it to Production and Preview.

**If Blob isn't connected, or an upload to it fails, photos are saved in the Upstash database instead,** so saving a car never breaks. Blob is still better for many photos. To check which one is in use, open `https://your-site/api/ping`: `"photoStore":"vercel-blob"` or `"photoStore":"database"`.

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

- See all cars and prices, and the **Recent activity** carousel posted by the admin.
- Pick dates to see which cars are free and the total price.
- Book in 3 steps: dates and extras → personal details and a **photo of their driver's license** → check and send. The photo shows in a small box; tapping it opens it larger, and tapping again zooms in.
- Log in to see **My bookings** with each booking's progress and assigned driver, read the office's comments, and chat in **Messages**.
- Edit their own details in **My details**, including uploading a new driver's license photo.
- Cancel up to 2 days before pickup. The admin can change the number of days.
- The **bell** at the top shows new messages from the office, booking approvals or rejections, and booking changes. A number shows how many are new. Tapping one opens it and marks it **Read**; **Mark all as read** clears them all.

## What the admin can do

- **Rentals**: approve or reject requests, mark pickup and return, comment, and change bookings (dates, car, extras, driver).
- **Customers**: everyone who has rented, with contact details and totals. **License** opens their driver's license photo. It also shows inside each booking.
- **Messages**: chat with customers.
- **Notifications (bell)**: new booking requests, new customer messages, and bookings a customer cancelled. The orange number is how many are new. Tapping one opens the booking or the chat and marks it **Read**; **Mark all as read** clears them. Read is saved on the server, so it stays read on your other phone or laptop. Replying to a chat also marks its message read.
- **Fleet**: add, edit or delete cars and prices. Each car has **photo slots, all optional**: **Front view** (the main photo), **Back view**, **Interior** (dashboard and steering wheel), **Inside / seats**, and 2 **Other photo** slots (for example a side view or the trunk). Empty slots show an icon and an **Add** button; filled slots have **Change** and **Remove**. The quick **Add photo** button in the Fleet list fills the next empty slot.
- **What customers see**: like Instagram, they swipe left and right through the car's photos on the card (or use the ‹ › arrows, or drag with a mouse), with dots, a 1/3 counter, and a label such as "Interior". Tapping a photo opens a larger viewer where they can keep swiping, use the arrows or the keyboard, and tap to zoom.
- **Adjusting photos**: whenever you add a car, post or driver photo, an editor opens so you can zoom in and out (slider, + and − buttons, mouse wheel, or two fingers) and drag the photo into place inside the frame. **Fill the frame** and **Show the whole photo** are one tap. What you see in the frame is exactly what customers see.
- **Drivers**: add, edit or delete drivers and assign them to bookings.
- **Recent activity**: post photos with a caption, details or description, and an optional date rented. Edit or delete posts later. Customers see them in a carousel (4 at a time on a computer, 3 on a tablet, 2 on a phone) on Cars, My bookings and My details; tapping a post shows it larger with the full description.
- **Reports**: filter by quick dates (Today, This week Mon–Sun, This month, Last month, This year, All time) or your own From/To dates (by pickup date or date booked), customer name/mobile/email, car, driver, and office pickup or delivery. The page has three sections, each with a TOTAL row:
  1. **Rentals and earnings**: approved, picked-up and returned bookings, the total earned, and an **Earnings by car** table (times rented, days, earned).
  2. **Pending**: requests waiting for an answer and what they'd earn if approved.
  3. **Cancelled and rejected**: with the office comment and the value lost.
  **Download Excel** saves exactly what you see, with sheets: Summary, Rentals and earnings, Earnings by car, Pending, Cancelled and rejected. Works without internet.
- **Settings**: the **contact details** shown in the footer of every page (mobile, email, office address, office hours; empty boxes are hidden), **social media and other links** (Facebook, Instagram, TikTok, YouTube, X, your website, and one other link you name, such as Viber or Shopee). Links must start with https://. They show as clickable icons with names in the footer's **Contact us**, under the line "Message us after you book, under Messages", the **website name and logo** (shown at the top of every page and in the browser tab), extras and prices, delivery fee, cancellation rule, admin login. A PNG logo with a clear background looks neatest.

## Design

The colours follow the 60-30-10 rule: a calm off-white base (60%), deep navy for the header, hero and footer (30%), and orange only for the main buttons (10%), so the next step always stands out. The booking ticket sits large near the top, and a strip under it lists real reasons to book, built from your Settings (cancellation days, delivery fee, drivers).

## On phones and small screens

Whenever the menu doesn't fit on one line (phones, small windows, and the longer admin menu on laptops), it folds into a ☰ button at the top right. Tap it to open the menu; tap a page or anywhere outside to close it. A small number on the button shows new requests or messages.

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
- Car photos, renter photos and the logo are public: anyone with their link can open them.
- **Driver's license photos are private.** They are stored apart from everything else (in Upstash Redis on Vercel, or `data/licenses/` on your computer), never in the public photo store. Only the admin and that customer can open them.
