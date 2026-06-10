/* Library Management System JavaScript */
const storageKeys = {
  books: 'LibraryBooks',
  students: 'LibraryStudents',
  transactions: 'LibraryTransactions',
  config: 'LibraryConfig'
};

const appState = {
  books: [],
  students: [],
  transactions: [],
  config: { fineRate: 5 }
};

const body = document.body;
const page = body.dataset.page || 'home';

function getStorage(key) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initApp() {
  appState.books = getStorage(storageKeys.books) || [];
  appState.students = getStorage(storageKeys.students) || [];
  appState.transactions = getStorage(storageKeys.transactions) || [];
  appState.config = getStorage(storageKeys.config) || { fineRate: 5 };
  setStorage(storageKeys.config, appState.config);
  initTheme();
  initMenu();
  updateDashboardCounts();
  if (page === 'books') initBookPage();
  if (page === 'students') initStudentPage();
  if (page === 'issue') initIssuePage();
  if (page === 'return') initReturnPage();
  if (page === 'reports') initReportsPage();
  if (page === 'contact') initContactForm();
  if (page === 'dashboard') initDashboardPage();
}

function initTheme() {
  const storedTheme = localStorage.getItem('LibraryTheme');
  const root = document.documentElement;
  if (storedTheme === 'dark') {
    root.style.setProperty('--bg', '#020617');
    root.style.setProperty('--surface', '#0f172a');
    root.style.setProperty('--surface-2', '#111827');
    root.style.setProperty('--text', '#e2e8f0');
    root.style.setProperty('--muted', '#94a3b8');
    root.style.setProperty('--border', '#1f2937');
    root.style.setProperty('--shadow', '0 24px 50px rgba(0,0,0,0.35)');
    body.classList.add('dark-mode');
  } else {
    root.style.setProperty('--bg', '#f5f7fb');
    root.style.setProperty('--surface', '#ffffff');
    root.style.setProperty('--surface-2', '#f0f3fb');
    root.style.setProperty('--text', '#172b4d');
    root.style.setProperty('--muted', '#65748b');
    root.style.setProperty('--border', '#e2e8f0');
    root.style.setProperty('--shadow', '0 20px 40px rgba(15, 23, 42, 0.08)');
    body.classList.remove('dark-mode');
  }
  const themeToggle = document.querySelector('#theme-toggle');
  if (themeToggle) {
    themeToggle.checked = storedTheme === 'dark';
    if (!themeToggle.dataset.initialized) {
      themeToggle.addEventListener('change', () => {
        const isDark = themeToggle.checked;
        localStorage.setItem('LibraryTheme', isDark ? 'dark' : 'light');
        initTheme();
      });
      themeToggle.dataset.initialized = 'true';
    }
  }
}

function initMenu() {
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!navToggle || !navLinks) return;
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.addEventListener('click', event => {
    if (!navToggle.contains(event.target) && !navLinks.contains(event.target)) {
      navLinks.classList.remove('open');
    }
  });
}

function showNotification(message, type = 'success') {
  const alert = document.querySelector('.alert');
  if (!alert) return;
  alert.textContent = message;
  alert.className = `alert ${type} show`;
  setTimeout(() => alert.classList.remove('show'), 3200);
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('en-GB');
}

function generateId(prefix = 'ID') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function updateDashboardCounts() {
  const totalBooks = appState.books.reduce((sum, book) => sum + Number(book.quantity), 0);
  const totalStudents = appState.students.length;
  const issuedBooks = appState.transactions.filter(tx => tx.status === 'issued').length;
  const returnedBooks = appState.transactions.filter(tx => tx.status === 'returned').length;
  const overdueBooks = appState.transactions.filter(tx => tx.status === 'issued' && new Date(tx.dueDate) < new Date()).length;

  const counts = {
    totalBooks, totalStudents, issuedBooks, returnedBooks, overdueBooks
  };
  Object.keys(counts).forEach(key => {
    const element = document.querySelector(`#${key}`);
    if (element) element.textContent = counts[key];
  });
}

function computeBookAvailability(book) {
  const issuedCount = appState.transactions.filter(tx => tx.bookId === book.id && tx.status === 'issued').length;
  const available = Math.max(0, Number(book.quantity) - issuedCount);
  return available;
}

function getBookStatus(book) {
  const available = computeBookAvailability(book);
  if (available === 0) return { label: 'Unavailable', className: 'status-unavailable' };
  if (available < 3) return { label: 'Low Stock', className: 'status-low' };
  return { label: 'Available', className: 'status-available' };
}

function initDashboardPage() {
  const summary = document.querySelector('#dashboard-summary');
  if (!summary) return;
  summary.textContent = `Welcome back, librarian. Manage books, students, issues and reports with a clean interface and instant updates.`;
}

function initBookPage() {
  const bookForm = document.querySelector('#book-form');
  const bookModal = document.querySelector('#book-modal');
  const bookBackdrop = document.querySelector('#book-backdrop');
  const bookTableBody = document.querySelector('#books-table tbody');
  const searchInput = document.querySelector('#book-search');
  const categoryFilter = document.querySelector('#book-category');
  const coverPreview = document.querySelector('#cover-preview');
  const coverInput = document.querySelector('#book-cover');
  let editId = null;

  function renderBooks() {
    if (!bookTableBody) return;
    const searchValue = searchInput?.value.trim().toLowerCase() || '';
    const categoryValue = categoryFilter?.value || 'all';
    const rows = appState.books.filter(book => {
      const matchesSearch = [book.title, book.author, book.isbn, book.publisher].some(field => field.toLowerCase().includes(searchValue));
      const matchesCategory = categoryValue === 'all' || book.category === categoryValue;
      return matchesSearch && matchesCategory;
    }).map(book => {
      const available = computeBookAvailability(book);
      const status = getBookStatus(book);
      return `
        <tr>
          <td>${book.id}</td>
          <td class="book-cell">
            <div class="cover-preview" style="width: 64px; height: 84px; min-height: unset; border-radius: 12px; overflow: hidden;">
              <img src="${book.cover || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=120&q=70'}" alt="Cover">
            </div>
          </td>
          <td>${book.title}</td>
          <td>${book.author}</td>
          <td>${book.publisher}</td>
          <td>${book.isbn}</td>
          <td>${book.category}</td>
          <td>${book.quantity}</td>
          <td>${available}</td>
          <td><span class="status-chip ${status.className}">${status.label}</span></td>
          <td>
            <button class="button button-secondary" data-action="edit" data-id="${book.id}">Edit</button>
            <button class="button button-secondary" data-action="delete" data-id="${book.id}">Delete</button>
          </td>
        </tr>`;
    }).join('');
    bookTableBody.innerHTML = rows || '<tr><td colspan="11">No books found. Add a new book to get started.</td></tr>';
  }

  function resetBookForm() {
    editId = null;
    bookForm.reset();
    coverPreview.innerHTML = 'Upload cover image or choose a file';
    delete coverPreview.dataset.cover;
    document.querySelector('#book-modal .modal-title').textContent = 'Add Book';
  }

  function openModal() {
    bookBackdrop.classList.add('active');
  }

  function closeModal() {
    bookBackdrop.classList.remove('active');
    resetBookForm();
  }

  function handleCoverPreview() {
    const file = coverInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      coverPreview.innerHTML = `<img src="${reader.result}" alt="Cover Preview">`;
      coverPreview.dataset.cover = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function saveBook(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(bookForm).entries());
    if (!data.title || !data.author || !data.publisher || !data.isbn || !data.category || !data.quantity) {
      showNotification('Please complete all required book fields.', 'error');
      return;
    }
    const bookData = {
      id: editId || generateId('BOOK'),
      title: data.title.trim(),
      author: data.author.trim(),
      publisher: data.publisher.trim(),
      isbn: data.isbn.trim(),
      category: data.category,
      quantity: Number(data.quantity),
      cover: coverPreview.dataset.cover || data.cover || ''
    };
    if (editId) {
      const index = appState.books.findIndex(book => book.id === editId);
      if (index >= 0) appState.books[index] = { ...appState.books[index], ...bookData };
      showNotification('Book updated successfully.');
    } else {
      appState.books.push(bookData);
      showNotification('Book added successfully.');
    }
    setStorage(storageKeys.books, appState.books);
    renderBooks();
    updateDashboardCounts();
    closeModal();
  }

  function editBook(id) {
    const book = appState.books.find(item => item.id === id);
    if (!book) return;
    editId = id;
    bookForm.title.value = book.title;
    bookForm.author.value = book.author;
    bookForm.publisher.value = book.publisher;
    bookForm.isbn.value = book.isbn;
    bookForm.category.value = book.category;
    bookForm.quantity.value = book.quantity;
    if (book.cover) {
      coverPreview.innerHTML = `<img src="${book.cover}" alt="Cover">`;
      coverPreview.dataset.cover = book.cover;
    } else {
      coverPreview.innerHTML = 'Upload cover image or choose a file';
      delete coverPreview.dataset.cover;
    }
    document.querySelector('#book-modal .modal-title').textContent = 'Edit Book';
    openModal();
  }

  function deleteBook(id) {
    if (!confirm('Delete this book permanently?')) return;
    appState.books = appState.books.filter(book => book.id !== id);
    setStorage(storageKeys.books, appState.books);
    renderBooks();
    updateDashboardCounts();
    showNotification('Book deleted.');
  }

  document.querySelector('#open-book-modal')?.addEventListener('click', openModal);
  document.querySelectorAll('#close-book-modal').forEach(button => button.addEventListener('click', closeModal));
  bookBackdrop?.addEventListener('click', event => { if (event.target === bookBackdrop) closeModal(); });
  coverInput?.addEventListener('change', handleCoverPreview);
  bookForm?.addEventListener('submit', saveBook);
  searchInput?.addEventListener('input', renderBooks);
  categoryFilter?.addEventListener('change', renderBooks);
  bookTableBody?.addEventListener('click', event => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (action === 'edit') editBook(id);
    if (action === 'delete') deleteBook(id);
  });
  renderBooks();
}

function initStudentPage() {
  const studentForm = document.querySelector('#student-form');
  const studentBackdrop = document.querySelector('#student-backdrop');
  const studentTableBody = document.querySelector('#students-table tbody');
  const searchInput = document.querySelector('#student-search');
  let editId = null;

  function renderStudents() {
    if (!studentTableBody) return;
    const searchValue = searchInput?.value.trim().toLowerCase() || '';
    const rows = appState.students.filter(student => {
      const matchesSearch = [student.name, student.email, student.id, student.department].some(field => field.toLowerCase().includes(searchValue));
      return matchesSearch;
    }).map(student => `
      <tr>
        <td>${student.id}</td>
        <td>${student.name}</td>
        <td>${student.email}</td>
        <td>${student.phone}</td>
        <td>${student.department}</td>
        <td>${student.semester}</td>
        <td>
          <button class="button button-secondary" data-action="edit" data-id="${student.id}">Edit</button>
          <button class="button button-secondary" data-action="delete" data-id="${student.id}">Delete</button>
        </td>
      </tr>`).join('');
    studentTableBody.innerHTML = rows || '<tr><td colspan="7">No students found. Register a student to continue.</td></tr>';
  }

  function resetStudentForm() {
    editId = null;
    studentForm.reset();
    document.querySelector('#student-modal .modal-title').textContent = 'Add Student';
  }

  function openModal() {
    studentBackdrop.classList.add('active');
  }

  function closeModal() {
    studentBackdrop.classList.remove('active');
    resetStudentForm();
  }

  function saveStudent(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(studentForm).entries());
    if (!data.name || !data.email || !data.phone || !data.department || !data.semester) {
      showNotification('Please complete all student fields.', 'error');
      return;
    }
    const studentData = {
      id: editId || generateId('STU'),
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      department: data.department,
      semester: data.semester
    };
    if (editId) {
      const index = appState.students.findIndex(student => student.id === editId);
      if (index >= 0) appState.students[index] = studentData;
      showNotification('Student record updated.');
    } else {
      appState.students.push(studentData);
      showNotification('Student registered successfully.');
    }
    setStorage(storageKeys.students, appState.students);
    renderStudents();
    updateDashboardCounts();
    closeModal();
  }

  function editStudent(id) {
    const student = appState.students.find(item => item.id === id);
    if (!student) return;
    editId = id;
    studentForm.name.value = student.name;
    studentForm.email.value = student.email;
    studentForm.phone.value = student.phone;
    studentForm.department.value = student.department;
    studentForm.semester.value = student.semester;
    document.querySelector('#student-modal .modal-title').textContent = 'Edit Student';
    openModal();
  }

  function deleteStudent(id) {
    if (!confirm('Delete this student record?')) return;
    appState.students = appState.students.filter(student => student.id !== id);
    setStorage(storageKeys.students, appState.students);
    renderStudents();
    updateDashboardCounts();
    showNotification('Student deleted.');
  }

  document.querySelector('#open-student-modal')?.addEventListener('click', openModal);
  document.querySelectorAll('#close-student-modal').forEach(button => button.addEventListener('click', closeModal));
  studentBackdrop?.addEventListener('click', event => { if (event.target === studentBackdrop) closeModal(); });
  studentForm?.addEventListener('submit', saveStudent);
  searchInput?.addEventListener('input', renderStudents);
  studentTableBody?.addEventListener('click', event => {
    const action = event.target.dataset.action;
    const id = event.target.dataset.id;
    if (action === 'edit') editStudent(id);
    if (action === 'delete') deleteStudent(id);
  });
  renderStudents();
}

function initIssuePage() {
  const issueForm = document.querySelector('#issue-form');
  const studentSelect = document.querySelector('#issue-student');
  const bookSelect = document.querySelector('#issue-book');
  const selectSummary = document.querySelector('#issue-summary');
  const fineRateInput = document.querySelector('#fine-rate');
  const issueCountElement = document.querySelector('#issue-count');

  function populateSelects() {
    if (!studentSelect || !bookSelect) return;
    studentSelect.innerHTML = `<option value="">Select student</option>${appState.students.map(student => `<option value="${student.id}">${student.name} • ${student.department}</option>`).join('')}`;
    const availableBooks = appState.books.filter(book => computeBookAvailability(book) > 0);
    bookSelect.innerHTML = `<option value="">Select book</option>${availableBooks.map(book => `<option value="${book.id}">${book.title} (${book.category}) - ${computeBookAvailability(book)} available</option>`).join('')}`;
    if (issueCountElement) {
      issueCountElement.textContent = appState.transactions.filter(tx => tx.status === 'issued').length;
    }
  }

  function updateSummary() {
    const student = appState.students.find(item => item.id === studentSelect.value);
    const book = appState.books.find(item => item.id === bookSelect.value);
    selectSummary.innerHTML = `
      <p><strong>Student:</strong> ${student ? student.name : 'None selected'}</p>
      <p><strong>Book:</strong> ${book ? book.title : 'None selected'}</p>
    `;
  }

  function saveIssue(event) {
    event.preventDefault();
    if (!studentSelect.value || !bookSelect.value || !issueForm.issueDate.value || !issueForm.dueDate.value) {
      showNotification('Please fill all issue details.', 'error');
      return;
    }
    const book = appState.books.find(item => item.id === bookSelect.value);
    if (!book || computeBookAvailability(book) <= 0) {
      showNotification('Selected book is not available.', 'error');
      return;
    }
    const student = appState.students.find(item => item.id === studentSelect.value);
    const transaction = {
      id: generateId('ISSUE'),
      bookId: book.id,
      bookTitle: book.title,
      studentId: student.id,
      studentName: student.name,
      issueDate: issueForm.issueDate.value,
      dueDate: issueForm.dueDate.value,
      returnDate: null,
      fine: 0,
      status: 'issued'
    };
    appState.transactions.push(transaction);
    setStorage(storageKeys.transactions, appState.transactions);
    issueForm.reset();
    populateSelects();
    updateDashboardCounts();
    updateSummary();
    if (fineRateInput) fineRateInput.value = appState.config.fineRate;
    showNotification('Book issued successfully.');
  }

  function updateFineRate() {
    const value = Number(fineRateInput.value);
    if (value >= 0) {
      appState.config.fineRate = value;
      setStorage(storageKeys.config, appState.config);
      showNotification('Fine rate updated.');
    }
  }

  if (fineRateInput) {
    fineRateInput.value = appState.config.fineRate;
    fineRateInput.addEventListener('change', updateFineRate);
  }

  function setDefaultDates() {
    const today = new Date();
    const issueDate = today.toISOString().slice(0, 10);
    const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (issueForm.issueDate && !issueForm.issueDate.value) issueForm.issueDate.value = issueDate;
    if (issueForm.dueDate && !issueForm.dueDate.value) issueForm.dueDate.value = dueDate;
  }

  studentSelect?.addEventListener('change', updateSummary);
  bookSelect?.addEventListener('change', updateSummary);
  issueForm?.addEventListener('submit', saveIssue);
  populateSelects();
  setDefaultDates();
  updateSummary();
}

function initReturnPage() {
  const returnForm = document.querySelector('#return-form');
  const transactionSelect = document.querySelector('#return-transaction');
  const returnSummary = document.querySelector('#return-summary');
  const fineAmount = document.querySelector('#return-fine');

  function populateReturns() {
    const openIssues = appState.transactions.filter(tx => tx.status === 'issued');
    transactionSelect.innerHTML = `<option value="">Choose issued book</option>${openIssues.map(tx => `<option value="${tx.id}">${tx.bookTitle} → ${tx.studentName} (Due ${formatDate(tx.dueDate)})</option>`).join('')}`;
    returnSummary.textContent = openIssues.length ? 'Select a transaction to process return.' : 'No issued books available to return.';
  }

  function updateReturnPreview() {
    const transaction = appState.transactions.find(tx => tx.id === transactionSelect.value);
    if (!transaction) {
      returnSummary.textContent = 'Select a transaction to process return.';
      return;
    }
    const due = new Date(transaction.dueDate);
    const returnDate = new Date(returnForm.returnDate.value || new Date().toISOString().slice(0, 10));
    const overdueDays = Math.max(0, Math.ceil((returnDate - due) / (1000 * 60 * 60 * 24)));
    const fine = overdueDays * appState.config.fineRate;
    fineAmount.textContent = `₹${fine}`;
    returnSummary.innerHTML = `
      <p><strong>Book:</strong> ${transaction.bookTitle}</p>
      <p><strong>Student:</strong> ${transaction.studentName}</p>
      <p><strong>Due Date:</strong> ${formatDate(transaction.dueDate)}</p>
      <p><strong>Overdue Days:</strong> ${overdueDays}</p>
    `;
  }

  function saveReturn(event) {
    event.preventDefault();
    const transaction = appState.transactions.find(tx => tx.id === transactionSelect.value);
    if (!transaction) {
      showNotification('Please select a transaction.', 'error');
      return;
    }
    const returnDate = returnForm.returnDate.value;
    if (!returnDate) {
      showNotification('Select a return date.', 'error');
      return;
    }
    const due = new Date(transaction.dueDate);
    const actual = new Date(returnDate);
    const overdueDays = Math.max(0, Math.ceil((actual - due) / (1000 * 60 * 60 * 24)));
    const fine = overdueDays * appState.config.fineRate;
    transaction.returnDate = returnDate;
    transaction.fine = fine;
    transaction.status = 'returned';
    const book = appState.books.find(item => item.id === transaction.bookId);
    setStorage(storageKeys.transactions, appState.transactions);
    updateDashboardCounts();
    populateReturns();
    returnForm.reset();
    showNotification('Book returned successfully.');
  }

  function setReturnDate() {
    const today = new Date().toISOString().slice(0, 10);
    if (returnForm.returnDate && !returnForm.returnDate.value) returnForm.returnDate.value = today;
  }

  transactionSelect?.addEventListener('change', updateReturnPreview);
  returnForm?.addEventListener('submit', saveReturn);
  populateReturns();
  setReturnDate();
}

function initReportsPage() {
  const issuedTable = document.querySelector('#issued-table tbody');
  const returnedTable = document.querySelector('#returned-table tbody');
  const overdueTable = document.querySelector('#overdue-table tbody');
  const fineTable = document.querySelector('#fine-table tbody');
  const tabs = document.querySelectorAll('.simple-tab');
  const sections = document.querySelectorAll('.report-section');
  const exportButtons = document.querySelectorAll('[data-export]');
  const printButton = document.querySelector('#print-reports');

  function renderReportRows() {
    const issued = appState.transactions.filter(tx => tx.status === 'issued');
    const returned = appState.transactions.filter(tx => tx.status === 'returned');
    const overdue = appState.transactions.filter(tx => tx.status === 'issued' && new Date(tx.dueDate) < new Date());
    const fines = appState.transactions.filter(tx => tx.status === 'returned' && tx.fine > 0);

    issuedTable.innerHTML = issued.map(tx => `<tr><td>${tx.id}</td><td>${tx.bookTitle}</td><td>${tx.studentName}</td><td>${formatDate(tx.issueDate)}</td><td>${formatDate(tx.dueDate)}</td><td>Issued</td></tr>`).join('') || '<tr><td colspan="6">No issued books yet.</td></tr>';
    returnedTable.innerHTML = returned.map(tx => `<tr><td>${tx.id}</td><td>${tx.bookTitle}</td><td>${tx.studentName}</td><td>${formatDate(tx.issueDate)}</td><td>${formatDate(tx.returnDate)}</td><td>₹${tx.fine}</td></tr>`).join('') || '<tr><td colspan="6">No returns have been recorded.</td></tr>';
    overdueTable.innerHTML = overdue.map(tx => `<tr><td>${tx.id}</td><td>${tx.bookTitle}</td><td>${tx.studentName}</td><td>${formatDate(tx.dueDate)}</td><td>${Math.max(0, Math.ceil((new Date() - new Date(tx.dueDate)) / (1000*60*60*24)))}</td><td>Pending</td></tr>`).join('') || '<tr><td colspan="6">No overdue books.</td></tr>';
    fineTable.innerHTML = fines.map(tx => `<tr><td>${tx.id}</td><td>${tx.bookTitle}</td><td>${tx.studentName}</td><td>${formatDate(tx.returnDate)}</td><td>₹${tx.fine}</td></tr>`).join('') || '<tr><td colspan="5">No fines recorded.</td></tr>';
  }

  function switchTab(event) {
    tabs.forEach(tab => tab.classList.remove('active'));
    sections.forEach(section => section.classList.add('hidden'));
    const target = event.currentTarget.dataset.target;
    event.currentTarget.classList.add('active');
    document.querySelector(target)?.classList.remove('hidden');
  }

  function exportCSV(event) {
    const target = event.currentTarget.dataset.export;
    let rows = [];
    if (target === 'issued') rows = [['Issue ID', 'Book', 'Student', 'Issue Date', 'Due Date', 'Status'], ...appState.transactions.filter(tx => tx.status === 'issued').map(tx => [tx.id, tx.bookTitle, tx.studentName, formatDate(tx.issueDate), formatDate(tx.dueDate), 'Issued'])];
    if (target === 'returned') rows = [['Issue ID', 'Book', 'Student', 'Issue Date', 'Return Date', 'Fine'], ...appState.transactions.filter(tx => tx.status === 'returned').map(tx => [tx.id, tx.bookTitle, tx.studentName, formatDate(tx.issueDate), formatDate(tx.returnDate), `₹${tx.fine}`])];
    if (target === 'overdue') rows = [['Issue ID', 'Book', 'Student', 'Due Date', 'Overdue Days', 'Status'], ...appState.transactions.filter(tx => tx.status === 'issued' && new Date(tx.dueDate) < new Date()).map(tx => [tx.id, tx.bookTitle, tx.studentName, formatDate(tx.dueDate), Math.max(0, Math.ceil((new Date() - new Date(tx.dueDate)) / (1000*60*60*24))), 'Overdue'])];
    if (target === 'fine') rows = [['Issue ID', 'Book', 'Student', 'Return Date', 'Fine'], ...appState.transactions.filter(tx => tx.status === 'returned' && tx.fine > 0).map(tx => [tx.id, tx.bookTitle, tx.studentName, formatDate(tx.returnDate), `₹${tx.fine}`])];
    const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    link.download = `${target}-report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('CSV exported successfully.');
  }

  tabs.forEach(tab => tab.addEventListener('click', switchTab));
  exportButtons.forEach(button => button.addEventListener('click', exportCSV));
  printButton?.addEventListener('click', () => window.print());
  renderReportRows();
}

function initContactForm() {
  const contactForm = document.querySelector('#contact-form');
  contactForm?.addEventListener('submit', event => {
    event.preventDefault();
    showNotification('Message sent successfully. Thank you for reaching out.', 'success');
    contactForm.reset();
  });
}

window.addEventListener('DOMContentLoaded', initApp);
