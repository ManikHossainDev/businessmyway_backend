# let's start work on the full fresh new project with this project structure

we need below modules

1. auth
    - login (social (google, apple), email+password) with app,
    - signup (name, email, password, confirm password, accept_t%c)
    - forget password
    - resend otp (5 digit)(signup + forget)
    - verify otp (5 digit)(signup + forget)
    - reset password (password, confirm password)
    - complete profile - onboarding( avatarImage, role (landlord, homeOwner, renter), phone(country code + phone - separate), address (text), property videos, property images max(10))
    - Onboarding logics - once user signup that time onboarding path will be verify, once verified then profile complete, once profile complete then under review, once it's approved then onboarding completed.

    - get me (name, avatar, id, role, email, phone, address, plan details)

2. Home screen
    - Get user(self),
    - get subscription plan details with expiry time,
    - renew plan
    - view all plans
    - claim stats(total under review count, approved count, rejected count)
    - submit claim (title, description, date, location, comments, media(images + videos))

3. Claim page
    - All claim with (title, status (default "under_review", rejected, approved), location, id(CLM-2341(custom id), submitted date))
    - need filters and pagination as well (filter(all, pending, approved, rejected))
4. Plans
    - list of all plans (title, price-monthly, price-yearly, features(array of strings), benefits(array of string), )

5. Profile
    - Edit profile (avatar, name, phone, address)
    - payment history list with pagination (title(plan), invoiceId (INV-2026-001 - custom), date, amount)
6. Notifications
    - need a reasonable title, message, timestamps
      like( claim approved, payment successful, Renewal reminder, claim rejected and some other events we've to capture)

## Admin

    1. Auth
        - authentication same but only email and password with seeded admin data.
    2. Dashboard
        - stats(total user count, completed claim count, total earn)
        - bar chart (monthly earnings)

    3. Users
        - two tabs for users(User lists(active) - User Request(signup) not approved yet) with the below fields with pagination, search(email,name) and filter(by plan_id(plan)): id, name, email, plan, plan_status, avatar, role, address, videos, images, and for requested users need request date
    4. Claim Requests
        - users claimed request list with search(name, email), filter(by status(pending, approved, reject)) and pagination as well with the below fields:
            - id, name, role, plan, status, users info from the users tab and including the claim details (title, description, date, address, media, claim status(approved, reject, pending))
        - admin can approve or reject the claim as well
    5. Plan info
        - list of plan with pagination
            title, price monthly, price yearly, coverage features (array of strings, benefits(array of strings))
        - create plan,
        - edit plan,
        - delete plan
        - active/deactivate plan
        Note: for users need to fetch only active plan to show

    6. Settings
        1. Privacy Policy (Rich text content)
            - can edit/view
            - and public users can also view without authentication
        2. Terms and conditions (Rich text content)
            - can edit/view
            - and public users can also view without authentication
        3. About us(Rich text content)
            - can edit/view
            - and public users can also view without authentication
        4. Delete instructions static with image suggestions
            - and public users can also view without authentication
        3. Contact Us A form with some details
            - and public users can also view without authentication
    7. Notifications
        - need a reasonable title, message, timestamps
        like( a user registration successfully, request to approved, claim a request and some other events we've to capture)
