# 📋 ActBuilder · єВідновлення

> A web application for automated real estate damage assessment, repair cost calculation, and the generation of official inspection acts and checklists under the "єВідновлення" state program.

## 🌟 About the Project

ActBuilder significantly simplifies and accelerates the workflow of commissions assessing damaged property. The application allows users to input property details, dynamically add damage zones (roof, windows, walls, engineering networks), and automatically calculates the volume and cost of restoration work based on built-in tariffs.

The final output consists of ready-to-use `.docx` documents (Act and Checklist) formatted according to approved government templates.

---

## ✨ Key Features

* **Dynamic Inspection Forms:** A user-friendly interface to add any number of buildings, rooms, owners, and damage zones.
* **Smart Calculator:** Automatically calculates areas and total damage costs for each category and the property as a whole.
* **Document Generation:** Creates ready-to-use Word documents (Inspection Act and Checklist) directly in the browser, filling in all necessary variables.
* **Cloud Database & Authentication:** Supabase integration for secure login (with user and admin roles) and saving property history.
* **Autosave System:** Form data is saved in `localStorage` — nothing is lost if the tab is accidentally closed.
* **Theme Management:** Supports light and dark modes for a comfortable workspace.

---

## 🛠 Tech Stack & Roadmap

### Current State (Legacy)
Currently, the application is built as a monolithic Single File Component for rapid prototyping:
* HTML5 / CSS3 (Native CSS Variables)
* Vanilla JavaScript
* **Supabase JS Client** — Authentication and Database
* **docxtemplater & PizZip** — Template parsing and `.docx` generation
* **FileSaver.js** — Downloading generated files

### 🚧 Upcoming Refactoring (Migration to Next.js)
The project is currently in the process of being completely rewritten to a modern component-based architecture. The planned stack includes:
* **Framework:** Next.js (App Router)
* **UI/Components:** React + Tailwind CSS / shadcn/ui
* **Form Management:** React Hook Form + Zod (for strict validation)
* **State Management:** Zustand or Redux (to replace global variables and handle complex `calcAll` logic)

---

## 📂 Database Structure (Supabase)

The project uses Supabase with the following structure:
* **`profiles` table**: Stores user data and roles (`user`, `admin`).
* **`acts` table**: Stores the saved inspection acts.
    * `id` (UUID)
    * `address` (String)
    * `owner` (String)
    * `data` (JSONB) - A complete snapshot of the form data (main + static)
    * `user_id` (UUID) - Links the record to its author
