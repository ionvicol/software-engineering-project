# Game Tips Forum - Sprint 3

Sprint 3 implementation for the Software Engineering coursework.

## Included features

This version includes the required database-driven pages:
- Users list page
- User profile page
- Posts list page
- Post detail page
- Categories page
- Tags page

## What is used
- Node.js
- Express.js
- Pug
- MySQL
- Docker
- phpMyAdmin

## Run the project


docker compose up --build


Then open:
- App: http://localhost:3000
- phpMyAdmin: http://localhost:8081

## Main routes
- `/`
- `/users`
- `/users/:id`
- `/posts`
- `/posts/:id`
- `/categories`
- `/categories/:id`
- `/tags`
- `/tags/:id`

## Notes

- Sample data is loaded automatically from `sd2-db.sql` when the database container is created for the first time.
- If the database does not refresh, delete the local `db` folder and run Docker again.
