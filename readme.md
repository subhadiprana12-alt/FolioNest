# 📚 FolioNest — Library Management System

**FolioNest** is a modern, browser-based Library Management System designed to simplify and organize everyday library operations. It provides an intuitive dashboard to manage books, members, circulation activities, reservations, overdue loans, and library reports.

Built using vanilla HTML, CSS, and JavaScript, FolioNest offers a clean interface with practical library management features and browser-based data storage.

---

## ✨ Features

### 📊 1. Dashboard
- Overview of total book titles and physical copies.
- Track active loans and overdue books.
- Monitor library stock utilisation.
- Visual circulation trends.
- Recent library activity.
- Most borrowed books.
- Quick access to important operations.

### 📖 2. Book Management
- Add new books to the catalogue.
- Edit existing book information.
- View detailed book information.
- Delete books when permitted.
- Search books by catalogue information.
- Filter books by genre.
- Switch between available catalogue views.
- Track total and available copies.

### 👥 3. Member Management
- Register new library members.
- Maintain member information.
- Support three membership categories:
  - Undergraduate
  - Postgraduate
  - Staff
- View member borrowing activity.
- Apply borrowing limits according to membership type.

### 🔄 4. Book Circulation
- Issue books to registered members.
- Return borrowed books.
- Renew eligible loans.
- Place and manage book reservations (holds).
- Preview issue details and due dates.
- Prevent issuing unavailable books.
- Apply borrowing restrictions automatically.

### ⏰ 5. Loan & Fine Management
- Track active and completed loans.
- Identify overdue books.
- Calculate overdue fines automatically.
- Display loan statuses.
- Manage loan renewals and return records.

### 📈 6. Reports & Data Management
- View copies by genre.
- Monitor circulation statistics.
- Track the most active members.
- Export library data as JSON.
- Export loan records as CSV.
- Import existing JSON backups.
- Reset the application to sample data.

### 🌙 7. User Interface
- Clean and modern dashboard design.
- Light and dark themes.
- Interactive navigation.
- Notifications for overdue loans.
- Search functionality.
- Dialog boxes and toast notifications.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling and layout |
| JavaScript (Vanilla JS) | Application logic and interactivity |
| LocalStorage | Browser-based data persistence |
| Google Fonts | Typography |

**No external JavaScript framework or backend server is required.**

---

## 📁 Project Structure

```text
FolioNest/
│
├── index.html    # Main application page
├── style.css     # Styling and UI design
├── app.js        # Application logic
└── README.md     # Project documentation
```

---

## 🚀 Getting Started

Follow these steps to run FolioNest locally.

### 1. Clone the Repository

```bash
git clone https://github.com/subhadiprana12-alt/FolioNest.git
```

### 2. Navigate to the Project Directory

```bash
cd FolioNest
```

### 3. Run the Application

Open `index.html` directly in your web browser.

Alternatively, use the **Live Server** extension in Visual Studio Code for a convenient development experience.

---

## ⚙️ Library Management Rules

FolioNest includes predefined library management rules:

| Rule | Configuration |
|---|---|
| Standard loan period | 14 days |
| Grace period | 1 day |
| Overdue fine | ₹10 per day |
| Undergraduate limit | 3 books |
| Postgraduate limit | 5 books |
| Staff limit | 8 books |
| Maximum renewal | Once |
| Renewal extension | 7 days |

Additional restrictions prevent members with overdue books from borrowing more books or renewing overdue loans.

---

## 💾 Data Storage

FolioNest uses the browser's **LocalStorage** to maintain application data.

- Library records are saved locally in the browser.
- Data remains available across normal browser sessions.
- JSON backup functionality allows users to export and restore records.
- CSV export provides a convenient way to access loan information.

**Note:** This is a client-side application. It does not currently use a central database, backend API, or server-side authentication. Data is stored separately in the browser where the application is used.

---

## 🔮 Future Improvements

Potential enhancements for future versions include:

- User authentication and role-based access.
- Backend integration with a database.
- Cloud-based data synchronisation.
- Barcode-based book identification.
- Automated email notifications.
- Advanced analytics and reporting.
- Multi-user library management.

---

## 👨‍💻 Author

**Subhadip Rana**

B.Tech — Computer Science & Engineering (Artificial Intelligence & Machine Learning)

Institute of Engineering & Management (IEM), Kolkata

GitHub: [@subhadiprana12-alt](https://github.com/subhadiprana12-alt)

---

## 📄 License

This project is available for educational and personal learning purposes.

---

<p align="center">
  **FolioNest — Making Library Management Simpler.**
</p>