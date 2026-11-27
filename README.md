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
- Read the **Terms and conditions** page in the menu (also linked at the bottom of every page). Before sending a booking they must tick "I have read and agree to the Terms and conditions"; the link opens the terms without leaving the form.
- Pick dates to see which cars are free and the total price.
- Book in 3 steps: dates and extras → personal details and a **photo of their driver's license** → check and send. The photo shows in a small box; tapping it opens it larger, and tapping again zooms in.
- **My bookings** shows only current bookings (waiting for approval, approved and picked up, soonest pickup first). Deleted bookings don't show at all.
- **My history** is the customer's own report: totals (rentals, days rented, total for rentals, cancelled or not approved), filters (All time, This year, Last year, and by status), a table of every booking with a total row (tap a row for the full booking with pickup and return photos), and **Download Excel** with a Summary sheet and a My bookings sheet.
- Log in to see **My bookings** with each booking's progress and assigned driver, read the office's comments, and chat in **Messages**. They can send photos with the camera button. Under each message they sent there is **Edit** (the message then shows "Edited") and **Unsend** (asks first, then removes it for both sides).
- Edit their own details in **My details**, including uploading a new driver's license photo.
- Cancel up to 2 days before pickup. The admin can change the number of days.
- **Feedback** (in the customer menu, with a number badge): rentals waiting for their feedback, each with **Rate your rental**, and the reviews they already gave, with Edit for 7 days and the office's reply. A bell notification asks for feedback when the car is returned, and a second reminder comes 3 days later if they still haven't rated it.
- **Rate a rental (feedback):** after the office marks a booking Returned, the customer gets a notification and a reminder in My history. They give 1 to 5 stars, an optional comment, and can tick **Post anonymously**. Reviews show as first name and last initial ("Juan D.") or "Verified renter", with the car and month; never the full name. They can edit a review for 7 days.
- Choose where to get the car: each booking shows the **Pickup point** (the office by default, with Get directions). **Choose another place** lets them type a place and optionally paste a Google Maps link; **Use the office** switches back. They can change it until pickup. **Show route** opens a map with the driving route from the office to their place (also for delivery bookings, to their address), with **Open route in Google Maps** for turn-by-turn directions. The admin sees the same route in the booking details. The office is notified, sees the place with a map link in the booking, and confirms; a delivery fee may apply, which the admin adds with Change booking.
- See the **Pickup record** and **Return record** on each booking under My bookings: the office's photos of the car, the signed documents (photos or PDF) and the office's comments. Tapping a photo opens it larger; tapping a PDF opens it.
- The **bell** at the top shows new messages from the office, booking approvals or rejections, and booking changes. A number shows how many are new. Tapping one opens it and marks it **Read**; **Mark all as read** clears them all.

## What the admin can do

- **Rentals**: approve or reject requests, mark pickup and return, comment, and change bookings (dates, car, extras, driver).
  - **If a customer backs out after you approved:** open the booking and tap **Cancel booking**. It asks first, then the car is free again for those dates, the customer sees it as cancelled (and gets a notification), and it moves to the **Cancelled and rejected** report. There's no time limit for the admin. **Reopen** brings it back if they change their mind.
  - **Delete** (bottom left of the booking) removes the booking completely, including from reports. Use it only for mistakes or test bookings; for a real customer who backs out, **Cancel booking** keeps the record.
  - **Pickup and return records (proof):** once a booking is approved, its details window has two sections, **Car released / picked up** and **Car returned**. In each you can **Add photos** (any number, for example all sides of the car, the fuel gauge and odometer), **Add signed document** (the signed rental agreement with the terms, as a photo or a PDF under 650 KB), and write **Comments** (for example "Fuel full, 23,450 km, small scratch on the rear bumper"). The × on a file removes it. The customer sees all of it on their booking straight away and gets a notification. On a phone, **Add photos** can open the camera.
  - Each booking also shows **Terms: Agreed on (date)** when the customer ticked the terms box.
- **Deleting a customer**: Customers → **Delete** moves the whole account (bookings, messages, license photo, pickup and return records, reviews) to **Deleted customers** at the bottom of the page. It disappears from the system and the customer is logged out. **Restore** puts everything back; **Delete permanently** erases it now; otherwise it's erased automatically after one year. Deleting a customer's **only booking** from the booking window deletes the customer the same way (with a warning). Messages are never left behind: when the site starts, any conversation whose customer has no bookings left is moved to Deleted customers ("Messages left after all bookings were deleted"), and when a new account is created, anything left under the same name and mobile is moved there first. If the same person signs up again, the new account starts empty: none of the old bookings, messages, photos or files show, and the old account can't be restored over the new one (it can still be deleted permanently).
- **Customers**: everyone who has rented, with contact details and totals. **License** opens their driver's license photo. It also shows inside each booking.
- **Messages**: chat with customers. Tap the camera button to send a photo (with or without words). Under each message you sent there is **Edit** (fix the words; it then shows "Edited") and **Unsend** (removes it, and its photo, for both of you). You can only change your own messages. Chat photos are private: only you and that customer can open them.
- **Find us map**: in Settings → Contact details → **Office location on the map**, paste the **exact pin** (in Google Maps press and hold on your office, or right-click on a computer, and copy the two numbers such as 11.24430, 125.00390). You can also paste a Google Maps link (short maps.app.goo.gl links are opened by the server to find the pin) or the embed code. A **Preview** shows the map before you save and says what it is using. Without a pin or link, the map uses the office address, and Google may put the pin on a nearby place. Admins also see an **Edit location** button on the Find us section that jumps straight to this setting. The Cars page then shows a **Find us** section above the footer with the map, address, hours, phone, **Get directions** and **Open in Google Maps**. Customers who pick up at the office also see a **Pickup point** with Get directions on their booking, and the footer address gets a Get directions link. Untick "Show the Find us map" to hide the section.
- **Notifications (bell)**: new booking requests, new customer messages, and bookings a customer cancelled. The orange number is how many are new. Tapping one opens the booking or the chat and marks it **Read**; **Mark all as read** clears them. Read is saved on the server, so it stays read on your other phone or laptop. Replying to a chat also marks its message read.
- **Fleet**: add, edit or delete cars and prices. Each car has **photo slots, all optional**: **Front view** (the main photo), **Back view**, **Interior** (dashboard and steering wheel), **Inside / seats**, and 2 **Other photo** slots (for example a side view or the trunk). Empty slots show an icon and an **Add** button; filled slots have **Change** and **Remove**. The quick **Add photo** button in the Fleet list fills the next empty slot.
- **What customers see**: like Instagram, they swipe left and right through the car's photos on the card (or use the ‹ › arrows, or drag with a mouse), with dots, a 1/3 counter, and a label such as "Interior". Tapping a photo opens a larger viewer where they can keep swiping, use the arrows or the keyboard, and tap to zoom.
- **Adjusting photos**: whenever you add a car, post or driver photo, an editor opens so you can zoom in and out (slider, + and − buttons, mouse wheel, or two fingers) and drag the photo into place inside the frame. **Fill the frame** and **Show the whole photo** are one tap. What you see in the frame is exactly what customers see.
- **Reviews**: every review with the customer's real name, phone and booking. Reviews appear on the site right away; **Hide from the site** keeps one off the site without deleting it, **Save reply** posts a public reply, **Delete** removes it (the customer can then rate again). You get a notification for each new review. Visitors see a **What our renters say** section on the Cars page (average and review cards), a rating on each car card (tap it for that car's reviews) and "Rated 4.8 out of 5 by N renters" in the strip at the top. Only customers whose rental was returned can review, and only their own rental; the server builds the public name, so nobody can post under another name.
- **Units (more than one real car per listing)**: in Fleet → Edit, **Units of this car** lists every real car under that listing, with its plate, whether it's your **own car** or a **partner's car**, and a note (for example the owner's name and mobile). **Add a unit** as many times as you need. Customers can book the car as long as at least one unit is free for their whole dates; it only shows as booked when all units are out at the same time. Each booking is given a free unit's plate automatically, and in the booking details **Plate for this trip** lets you choose another unit or type a new plate (for example a partner car you just arranged); you're warned if that plate is already going out on those dates. The customer sees **Car plate** on their booking once it's approved and gets a notification when it changes. Cars with one unit work exactly as before.
- **Drivers**: add, edit or delete drivers and assign them to bookings. Each driver has a **Photo of the driver** (customers see it next to "Your driver" on their booking, so they know who to meet; tapping it shows it larger) and a **Photo of the driver's license** (private: only the admin can see it). Both have Change and Remove.
- **Recent activity**: post photos with a caption, details or description, and an optional date rented. Edit or delete posts later. Under **Order customers see**, one click switches the whole list between **Newest first** and **Oldest first**, sorted by the date on each post (a post without a date uses the day it was posted). Customers see the same order. Customers see them in a carousel (4 at a time on a computer, 3 on a tablet, 2 on a phone) on Cars, My bookings and My details; tapping a post shows it larger with the full description.
- **Reports**: filter by quick dates (Today, This week Mon–Sun, This month, Last month, This year, All time) or your own From/To dates (by pickup date or date booked), customer name/mobile/email, car, driver, and office pickup or delivery. The page has three sections, each with a TOTAL row:
  1. **Rentals and earnings**: approved, picked-up and returned bookings, the total earned, and an **Earnings by car** table (times rented, days, earned).
  2. **Pending**: requests waiting for an answer and what they'd earn if approved.
  3. **Cancelled and rejected**: with the office comment and the value lost.
  **Download Excel** saves exactly what you see, with sheets: Summary, Rentals and earnings, Earnings by car, Pending, Cancelled and rejected. Works without internet.
- **Settings**: **Terms and conditions** (a large box at the bottom; start a line with # for a heading and - for a bullet; it starts with sample text that you should replace with your own and have checked by a lawyer; empty the box to hide the page and the tick box), the **contact details** shown in the footer of every page (mobile, email, office address, office hours; empty boxes are hidden), **social media and other links** (Facebook, Instagram, TikTok, YouTube, X, your website, and one other link you name, such as Viber or Shopee). Links must start with https://. They show as clickable icons with names in the footer's **Contact us**, under the line "Message us after you book, under Messages", the **website name and logo** (shown at the top of every page and in the browser tab), the **top banner background** (your own photo behind "Rent a car for your next trip", with a slider to darken it so the heading stays readable, or **Use the road drawing** to go back), extras and prices, delivery fee, cancellation rule (the number of days, which the Cancel button follows, and **Your cancellation policy**, an optional box where you write the policy in your own words; customers see it when they book and on My bookings, and leaving it empty shows the standard sentence), admin login. A PNG logo with a clear background looks neatest.

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
- **Username login.** Customers log in with a **username** and the last 4 digits of their mobile. The username is made automatically from their first and last name plus their birth month and day: for example `juandelacruz0230`. If it's already taken, a number is added (`juandelacruz0230-2`) and the customer is told why. It never changes, even if they edit their name. The booking form asks for the **birthday** (required for new customers) and checks it against the **minimum age** in Settings → Fees and rules (21 by default; 0 = no check). The customer sees their username right after booking, as a bell notification and in My details. Customers from before usernames keep logging in with their full name until they add their birthday in My details, which gives them a username. The admin sees each username and birthday on the Customers page and in booking details; nobody else does.
- **Every account has its own customer ID, separate from the login.** Login = username (or, for older customers, full name) + last 4 digits of the mobile. ID = a unique key made once when the account is created, for example `C-20261127-2253-7F3A` (Customer, created 2026-11-27 at 22:53 Manila time, random code 7F3A). Every booking, message, license photo, file and review is filed under it. Only the admin sees it (Customers page, booking details, Deleted customers) and can search by it. It never contains the name or mobile, so it can't reveal anyone's login. Accounts from before this update (IDs like `t_name_1234`) are moved to a new-style ID automatically the next time the admin opens the site, dated from their first booking, with all their data; anyone logged in at that moment just logs in again.
- **Two people can never share one login.** The same person is the same full name and the same full mobile (0916 908 5565, 09169085565 and +63 916 908 5565 count as one). Someone with the same name but a different mobile has to add a middle name or initial. The admin can add another customer with the same name only if the last 4 digits differ; otherwise the admin is asked to add a middle initial too. Old pairs from before these rules are flagged on the Customers page ("Same login as another customer") so one of them can add a middle initial.
- **One account per full name.** If someone who isn't logged in books with a full name that already has an account but a different mobile number, the booking is stopped with a message: log in if it's you, or add a middle name or initial. A logged-in customer who books with a new mobile number stays in their own account. Customers also can't rename themselves to a name another account uses. The admin can still add a booking for anyone.
- Customer passwords are only 4 digits. The server allows 10 login tries per minute from one address to slow down guessing.
- **Change the admin password right away.** admin1 / admin123 is written in this README, so anyone could try it. Until you change it, the Rentals page shows a reminder with a **Change it now** button.
- One connection can send at most 5 booking requests a minute, so nobody can flood the system with fake bookings.
- Visitors and customers only see a driver's name, photo and whether they're available. Phone numbers, license numbers and notes stay with the admin (customers get their own driver's phone on their booking).
- No SQL database is used, so SQL injection doesn't apply: data is stored as JSON in Upstash Redis (or `data/db.json` on your computer) and saved by exact key, never by building commands from what people type. Paths are checked against a strict pattern, so tricks like `../` are refused.
- Everything people type (names, addresses, notes, messages, terms) is shown as plain text, so pasted HTML or scripts can't run in anyone's browser.
- The site sends a **Content Security Policy**: browsers only run this site's own script file, never scripts written into a page, so even if someone managed to slip code into a name or message it would not run. It also tells browsers not to let other websites embed it in a frame (click-jacking) and not to guess file types. These rules are in `vercel.json` (and `run-local.js`).
- **Availability is anonymous.** To show which dates are taken, visitors receive only car, dates and status. The list's internal names, which are made from the customer's name and mobile digits, are replaced with scrambled codes for everyone except the admin, so they can't be used to guess a customer's login.
- The contact details you enter in Settings (email, phone, address) are public on purpose: they're shown at the bottom of every page.
- Car photos, renter photos and the logo are public: anyone with their link can open them.
- **Driver's license photos are private.** They are stored apart from everything else (in Upstash Redis on Vercel, or `data/licenses/` on your computer), never in the public photo store. Only the admin and that customer can open them.
- **Pickup and return photos and signed documents are private too**, kept in the same place as license photos. Only the admin and the customer of that booking can open them; other customers and visitors can't, even with the link. Only the admin can add or remove them.
