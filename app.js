let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let goals = JSON.parse(localStorage.getItem('goals')) || [];
let currentEditingGoalId = null;
let currentEditingId = null;
let categoryChart = null;
let monthlyTrendChart = null;
let heatmapChart = null;
let categoryTrendChart = null;
let detailsModal = null;
let editModal = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Initialize modals
    detailsModal = new bootstrap.Modal(document.getElementById('expense-details-modal'));
    editModal = new bootstrap.Modal(document.getElementById('edit-expense-modal'));
    
    // Initialize charts
    initCharts();
    
    // Display initial data
    updateDashboard();
    displayExpensesList();
    renderGoals();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-theme');
        document.getElementById('dark-mode-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Set up periodic spending alerts
    setInterval(checkSpendingAlerts, 3600000); // Check every hour
});

function setupEventListeners() {
    // Category change for bank field visibility
    document.getElementById('category').addEventListener('change', function(e) {
        document.getElementById('bank-field').style.display = 
            e.target.value === 'Bank Transfer' ? 'block' : 'none';
    });
    
    // Payment source change for UPI bank field visibility
    document.getElementById('payment-source').addEventListener('change', function(e) {
        document.getElementById('upi-bank-field').style.display = 
            e.target.value === 'UPI' ? 'block' : 'none';
        document.getElementById('bank-field').style.display = 
            e.target.value === 'Net Banking' ? 'block' : 'none';
    });
    
    // Add expense form submission
    document.getElementById('add-expense-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addExpense();
    });
    
    // Filter changes
    document.getElementById('category-filter').addEventListener('change', displayExpensesList);
    document.getElementById('start-date').addEventListener('change', displayExpensesList);
    document.getElementById('end-date').addEventListener('change', displayExpensesList);
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', exportExpenses);
    
    // Save edited expense
    document.getElementById('save-expense-button').addEventListener('click', saveEditedExpense);
    
    // Monthly budget change
    document.getElementById('monthly-budget').addEventListener('change', function() {
        updateBudgetDisplay();
        updateDashboard(); // This will update the Total Saved value
    });
    
    // Dark mode toggle
    document.getElementById('dark-mode-toggle').addEventListener('click', toggleDarkMode);
    
    // AI category suggestion
    document.getElementById('description').addEventListener('blur', async function() {
        if (!document.getElementById('category').value) {
            const suggestedCat = await suggestCategory(this.value);
            document.getElementById('category').value = suggestedCat;
            showToast(`AI Suggestion: ${suggestedCat} category`, 'info');
        }
    });
    
    // Receipt capture
    document.getElementById('capture-receipt-btn').addEventListener('click', function() {
        document.getElementById('receipt-upload').click();
    });
    
    document.getElementById('receipt-upload').addEventListener('change', function(e) {
        handleReceiptUpload(e);
    });
    
    // Add goal button
    document.getElementById('add-goal-btn').addEventListener('click', function() {
        const addGoalModal = new bootstrap.Modal(document.getElementById('add-goal-modal'));
        addGoalModal.show();
    });
    
// Set up event listeners for goals
document.getElementById('confirm-add-goal').addEventListener('click', function() {
    const name = document.getElementById('goal-name').value.trim();
    const target = document.getElementById('goal-target').value;
    const saved = document.getElementById('goal-saved').value || "0";
    const deadline = document.getElementById('goal-deadline').value;
    
    // Validate required fields
    if (!name || !target || isNaN(parseFloat(target)) || !deadline) {
        showToast('Please fill all required fields with valid values', 'error');
        return;
    }

    // Create new goal
    const newGoal = {
        id: Date.now(),
        name,
        target: parseFloat(target),
        saved: parseFloat(saved),
        deadline
    };

    // Add to goals array
    goals.push(newGoal);
    saveGoals();
    renderGoals();
    
    // Close modal and reset form
    const addModal = bootstrap.Modal.getInstance(document.getElementById('add-goal-modal'));
    addModal.hide();
    document.getElementById('add-goal-form').reset();
    
    // Show success message
    showToast('New savings goal added!', 'success');
});

}

function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    const icon = document.getElementById('dark-mode-toggle').querySelector('i');
    if (document.body.classList.contains('dark-theme')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('darkMode', 'true');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('darkMode', 'false');
    }
}

function addExpense() {
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const description = document.getElementById('description').value;
    const paymentSource = document.getElementById('payment-source').value;
    
    // Validate required fields
    if (!date || !category || isNaN(amount) || !paymentSource) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    const newExpense = { 
        id: Date.now(),
        date, 
        category, 
        amount, 
        description,
        paymentSource
    };
    
    // Add bank details if applicable
    if (category === 'Bank Transfer') {
        newExpense.bank = document.getElementById('bank').value;
    }
    if (paymentSource === 'UPI') {
        newExpense.upiBank = document.getElementById('upi-bank').value;
    }
    
    expenses.push(newExpense);
    saveExpenses();
    
    // Reset form
    document.getElementById('add-expense-form').reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('bank-field').style.display = 'none';
    document.getElementById('upi-bank-field').style.display = 'none';
    
    // Update UI
    updateDashboard();
    displayExpensesList();
    
    // Show animation and success message
    animatePayment(amount, category);
    showToast('Expense added successfully!', 'success');
}

function animatePayment(amount, category) {
    const animationEl = document.createElement('div');
    animationEl.className = 'payment-animation';
    animationEl.innerHTML = `
        <div class="payment-amount">-₹${amount.toLocaleString('en-IN')}</div>
        <div class="payment-category">${category}</div>
    `;
    
    document.body.appendChild(animationEl);
    
    // Animation
    setTimeout(() => {
        animationEl.style.transform = 'translateY(-100px)';
        animationEl.style.opacity = '0';
        setTimeout(() => animationEl.remove(), 1000);
    }, 50);
}

function displayExpensesList() {
    const categoryFilter = document.getElementById('category-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    const filteredExpenses = expenses.filter(expense => {
        const matchesCategory = !categoryFilter || expense.category === categoryFilter;
        const matchesStartDate = !startDate || expense.date >= startDate;
        const matchesEndDate = !endDate || expense.date <= endDate;
        return matchesCategory && matchesStartDate && matchesEndDate;
    });
    
    const expensesList = document.getElementById('expenses-list');
    expensesList.innerHTML = '';
    
    if (filteredExpenses.length === 0) {
        expensesList.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-receipt fa-3x mb-3"></i>
                <p>No expenses found</p>
            </div>
        `;
        document.getElementById('total-expenses').textContent = 'Total Expenses: ₹0';
        updateCharts();
        return;
    }
    
    // Sort by date (newest first)
    filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    filteredExpenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        const formattedDate = expenseDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        const categoryClass = getCategoryClass(expense.category);
        
        const expenseItem = document.createElement('div');
        expenseItem.className = 'expense-item';
        expenseItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="expense-category ${categoryClass}">
                        ${expense.category}
                    </span>
                    <span class="text-muted small">${formattedDate}</span>
                </div>
                <div class="expense-amount text-primary">
                    ₹${expense.amount.toLocaleString('en-IN')}
                </div>
            </div>
            ${expense.description ? `<div class="mt-2 small text-muted">${expense.description}</div>` : ''}
            <div class="d-flex justify-content-between align-items-center mt-2">
                <span class="payment-method small">
                    <i class="fas fa-${getPaymentIcon(expense.paymentSource)} me-1"></i>
                    ${expense.paymentSource}
                </span>
                <button class="btn btn-sm btn-outline-primary view-details-btn" 
                        data-id="${expense.id}" 
                        data-bs-toggle="modal" 
                        data-bs-target="#expense-details-modal">
                    <i class="fas fa-eye me-1"></i>Details
                </button>
            </div>
        `;
        expensesList.appendChild(expenseItem);
    });
    
    // Calculate and display total
    const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    document.getElementById('total-expenses').textContent = 
        `Total Expenses: ₹${total.toLocaleString('en-IN')}`;
    
    // Update charts
    updateCharts();
    
    // Set up event listeners for detail buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const expenseId = parseInt(this.getAttribute('data-id'));
            showExpenseDetails(expenseId);
        });
    });
}

function showExpenseDetails(expenseId) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    const expenseDate = new Date(expense.date);
    const formattedDate = expenseDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    
    document.getElementById('expense-details-date').textContent = formattedDate;
    document.getElementById('expense-details-category').textContent = expense.category;
    document.getElementById('expense-details-amount').textContent = 
        `₹${expense.amount.toLocaleString('en-IN')}`;
    document.getElementById('expense-details-description').textContent = 
        expense.description || 'No description';
    document.getElementById('expense-details-payment-source').textContent = expense.paymentSource;
    
    // Show/hide bank details based on payment method
    const bankContainer = document.getElementById('expense-details-bank-container');
    const upiContainer = document.getElementById('expense-details-upi-container');
    
    if (expense.category === 'Bank Transfer' && expense.bank) {
        bankContainer.style.display = 'block';
        document.getElementById('expense-details-bank').textContent = expense.bank;
    } else {
        bankContainer.style.display = 'none';
    }
    
    if (expense.paymentSource === 'UPI' && expense.upiBank) {
        upiContainer.style.display = 'block';
        document.getElementById('expense-details-upi-bank').textContent = expense.upiBank;
    } else {
        upiContainer.style.display = 'none';
    }
    
    // Set up edit and delete buttons
    document.getElementById('edit-expense-button').onclick = () => {
        detailsModal.hide();
        editExpense(expense.id);
    };
    
    document.getElementById('delete-expense-button').onclick = () => {
        if (confirm('Are you sure you want to delete this expense?')) {
            deleteExpense(expense.id);
            detailsModal.hide();
        }
    };
    
    // Show the details modal
    detailsModal.show();
}

function editExpense(expenseId) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    currentEditingId = expenseId;
    
    // Fill the edit form
    document.getElementById('edit-expense-id').value = expense.id;
    document.getElementById('edit-date').value = expense.date;
    document.getElementById('edit-category').value = expense.category;
    document.getElementById('edit-bank').value = expense.bank || '';
    document.getElementById('edit-amount').value = expense.amount;
    document.getElementById('edit-description').value = expense.description || '';
    document.getElementById('edit-payment-source').value = expense.paymentSource;
    document.getElementById('edit-upi-bank').value = expense.upiBank || '';
    
    // Show/hide bank fields based on category and payment method
    document.getElementById('edit-bank-field').style.display = 
        expense.category === 'Bank Transfer' ? 'block' : 'none';
    document.getElementById('edit-upi-bank-field').style.display = 
        expense.paymentSource === 'UPI' ? 'block' : 'none';
    
    // Show the edit modal
    editModal.show();
}

function saveEditedExpense() {
    const expenseId = currentEditingId;
    const expenseIndex = expenses.findIndex(e => e.id === expenseId);
    
    if (expenseIndex === -1) return;
    
    // Validate amount
    const amount = parseFloat(document.getElementById('edit-amount').value);
    if (isNaN(amount)) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    // Get edited values
    const editedExpense = {
        id: expenseId,
        date: document.getElementById('edit-date').value,
        category: document.getElementById('edit-category').value,
        bank: document.getElementById('edit-category').value === 'Bank Transfer' ? 
              document.getElementById('edit-bank').value : '',
        upiBank: document.getElementById('edit-payment-source').value === 'UPI' ?
                document.getElementById('edit-upi-bank').value : '',
        amount: amount,
        description: document.getElementById('edit-description').value,
        paymentSource: document.getElementById('edit-payment-source').value
    };
    
    // Update the expense
    expenses[expenseIndex] = editedExpense;
    saveExpenses();
    
    // Update UI
    updateDashboard();
    displayExpensesList();
    
    // Hide the edit modal
    editModal.hide();
    
    // Show success feedback
    showToast('Expense updated successfully!', 'success');
}

function deleteExpense(expenseId) {
    expenses = expenses.filter(e => e.id !== expenseId);
    saveExpenses();
    updateDashboard();
    displayExpensesList();
    showToast('Expense deleted successfully!', 'success');
}

function updateDashboard() {
    // Today's expenses
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = expenses
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('today-expense').textContent = 
        `₹${todayExpenses.toLocaleString('en-IN')}`;
    
    // This month's expenses
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthExpenses = expenses
        .filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear;
        })
        .reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('month-expense').textContent = 
        `₹${monthExpenses.toLocaleString('en-IN')}`;
    
    // Total saved (can be negative)
    const monthlyBudget = parseFloat(document.getElementById('monthly-budget').value) || 0;
    const totalSaved = monthlyBudget - expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const totalSavedElement = document.getElementById('total-saved');
    totalSavedElement.textContent = 
        totalSaved >= 0 ? `₹${totalSaved.toLocaleString('en-IN')}` : `-₹${Math.abs(totalSaved).toLocaleString('en-IN')}`;
    
    // Style negative values in red
    if (totalSaved < 0) {
        totalSavedElement.classList.add('text-danger');
    } else {
        totalSavedElement.classList.remove('text-danger');
    }
    
    // Update budget display
    updateBudgetDisplay();
    
    // Check for spending alerts
    checkSpendingAlerts();
}

function updateBudgetDisplay() {
    const monthlyBudget = parseFloat(document.getElementById('monthly-budget').value) || 0;
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = monthlyBudget - totalSpent; // Can be negative
    const percentage = monthlyBudget > 0 ? Math.min(100, (totalSpent / monthlyBudget) * 100) : 0;

    document.getElementById('total-spent').textContent = totalSpent.toLocaleString('en-IN');
    document.getElementById('remaining-budget').textContent = 
        remaining >= 0 ? remaining.toLocaleString('en-IN') : `-₹${Math.abs(remaining).toLocaleString('en-IN')}`;
    document.getElementById('budget-progress-bar').style.width = `${percentage}%`;
    
    // Color coding for budget progress
    const progressBar = document.getElementById('budget-progress-bar');
    progressBar.className = `progress-bar ${
        percentage > 90 ? 'bg-danger' : 
        percentage > 70 ? 'bg-warning' : 'bg-success'
    }`;
}

function checkSpendingAlerts() {
    const today = new Date().toISOString().split('T')[0];
    const todaySpending = expenses
        .filter(e => e.date === today)
        .reduce((sum, e) => sum + e.amount, 0);
    
    const dailyAvg = expenses.length > 0 
        ? expenses.reduce((sum, e) => sum + e.amount, 0) / 30 
        : 0;
    
    if (todaySpending > dailyAvg * 1.5 && dailyAvg > 0) {
        showAlert(
            `High spending alert! You've spent ₹${todaySpending.toLocaleString('en-IN')} today, ` +
            `which is ${Math.round((todaySpending/dailyAvg)*100)}% of your daily average.`,
            'warning'
        );
    }
}

// Add these functions to your existing code
function setupGoalEventListeners() {
    // Edit Goal button
    document.getElementById('edit-goal-btn').addEventListener('click', function() {
        const goalId = parseInt(this.getAttribute('data-id'));
        editGoal(goalId);
    });

    // Delete Goal button
    document.getElementById('delete-goal-btn').addEventListener('click', function() {
        const goalId = parseInt(this.getAttribute('data-id'));
        deleteGoal(goalId);
    });
}

function editGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    currentEditingGoalId = goalId;

    // Fill the edit form (using edit-goal- prefix for edit modal fields)
    document.getElementById('edit-goal-name').value = goal.name;
    document.getElementById('edit-goal-target').value = goal.target;
    document.getElementById('edit-goal-saved').value = goal.saved;
    document.getElementById('edit-goal-deadline').value = goal.deadline;
    document.getElementById('edit-goal-id').value = goal.id;

    // Show the edit modal (not the add modal)
    const editModal = new bootstrap.Modal(document.getElementById('edit-goal-modal'));
    editModal.show();
}

function deleteGoal(goalId) {
    if (confirm('Are you sure you want to delete this goal?')) {
        goals = goals.filter(g => g.id !== goalId);
        saveGoals();
        renderGoals();
        showToast('Goal deleted successfully!', 'success');
    }
}

function renderGoals() {
    const goalsList = document.getElementById('goals-list');
    goalsList.innerHTML = '';
    
    if (goals.length === 0) {
        goalsList.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-bullseye fa-3x mb-3"></i>
                <p>No savings goals yet</p>
            </div>
        `;
        return;
    }

    goals.forEach(goal => {
        const progress = (goal.saved / goal.target) * 100;
        const goalEl = document.createElement('div');
        goalEl.className = 'goal-item mb-3 p-3';
        goalEl.innerHTML = `
            <div class="d-flex justify-content-between">
                <h5>${goal.name}</h5>
                <span>₹${goal.saved.toLocaleString('en-IN')} / ₹${goal.target.toLocaleString('en-IN')}</span>
            </div>
            <div class="progress mt-2">
                <div class="progress-bar bg-success" role="progressbar" 
                    style="width: ${progress}%"></div>
            </div>
            <div class="d-flex justify-content-between mt-2">
                <small>Target: ${new Date(goal.deadline).toLocaleDateString()}</small>
                <div>
                    <button class="btn btn-sm btn-outline-primary edit-goal-btn" data-id="${goal.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-success add-funds-btn" data-id="${goal.id}">
                        <i class="fas fa-plus"></i> Add Funds
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-goal-btn" data-id="${goal.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        goalsList.appendChild(goalEl);
    });

    // Set up event listeners for all goal buttons
    document.querySelectorAll('.add-funds-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const goalId = parseInt(this.getAttribute('data-id'));
            const goal = goals.find(g => g.id === goalId);
            if (!goal) return;

            const amount = parseFloat(prompt(`Enter amount to add to ${goal.name}:`, '0'));
            if (!isNaN(amount) && amount > 0) {
                goal.saved = Math.min(goal.target, goal.saved + amount);
                saveGoals();
                renderGoals();
                showToast(`Added ₹${amount.toLocaleString('en-IN')} to ${goal.name}`, 'success');
            }
        });
    });

    document.querySelectorAll('.edit-goal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const goalId = parseInt(this.getAttribute('data-id'));
            editGoal(goalId);
        });
    });

    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const goalId = parseInt(this.getAttribute('data-id'));
            deleteGoal(goalId);
        });
    });
}

function addNewGoal(e) {
    // Prevent default form submission if event is provided
    if (e) e.preventDefault();

    // Get form values
    const name = document.getElementById('goal-name').value.trim();
    const target = document.getElementById('goal-target').value;
    const saved = document.getElementById('goal-saved').value || "0";
    const deadline = document.getElementById('goal-deadline').value;
    const totalSavedElement = document.getElementById('total-saved');
    totalSavedElement.textContent = 
        totalSaved >= 0 ? `₹${totalSaved.toLocaleString('en-IN')}` : `-₹${Math.abs(totalSaved).toLocaleString('en-IN')}`;

    // Add red color if negative
    if (totalSaved < 0) {
        totalSavedElement.classList.add('text-danger');
    } else {
        totalSavedElement.classList.remove('text-danger');
    }
    // Validate required fields
    if (!name || !target || isNaN(parseFloat(target))) {
        showToast('Please fill all required fields with valid values', 'error');
        return false;
    }

    // Create new goal
    const newGoal = {
        id: Date.now(),
        name,
        target: parseFloat(target),
        saved: parseFloat(saved),
        deadline
    };

    // Add to goals array
    goals.push(newGoal);
    saveGoals();
    renderGoals();
    
    // Close modal and reset form
    const addModal = bootstrap.Modal.getInstance(document.getElementById('add-goal-modal'));
    if (addModal) addModal.hide();
    document.getElementById('add-goal-form').reset();
    
    // Show success message
    showToast('New savings goal added!', 'success');
    return true;
}

function saveEditedGoal() {
    const goalId = parseInt(document.getElementById('edit-goal-id').value);
    const goalIndex = goals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) return;

    const name = document.getElementById('edit-goal-name').value;
    const target = parseFloat(document.getElementById('edit-goal-target').value);
    const saved = parseFloat(document.getElementById('edit-goal-saved').value) || 0;
    const deadline = document.getElementById('edit-goal-deadline').value;

    if (!name || isNaN(target) || !deadline) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    goals[goalIndex] = {
        id: goalId,
        name,
        target,
        saved,
        deadline
    };

    saveGoals();
    renderGoals();
    
    const editModal = bootstrap.Modal.getInstance(document.getElementById('edit-goal-modal'));
    editModal.hide();
    
    showToast('Goal updated successfully!', 'success');
}

function saveGoals() {
    localStorage.setItem('goals', JSON.stringify(goals));
}

document.addEventListener('DOMContentLoaded', function() {
    // Form submission handler only
    document.getElementById('add-goal-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('goal-name').value.trim();
        const target = document.getElementById('goal-target').value;
        const saved = document.getElementById('goal-saved').value || "0";
        const deadline = document.getElementById('goal-deadline').value;
        
        if (!name || !target || isNaN(parseFloat(target)) || !deadline) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        goals.push({
            id: Date.now(),
            name,
            target: parseFloat(target),
            saved: parseFloat(saved),
            deadline
        });
        
        saveGoals();
        renderGoals();
        
        const addModal = bootstrap.Modal.getInstance(document.getElementById('add-goal-modal'));
        addModal.hide();
        this.reset();
        
        showToast('New savings goal added!', 'success');
    });

    // Edit goal handler
    document.getElementById('confirm-edit-goal').addEventListener('click', saveEditedGoal);

    renderGoals();
});

function handleReceiptUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('receipt-image').src = event.target.result;
        document.getElementById('receipt-preview').style.display = 'block';
        
        // Simulate OCR processing
        setTimeout(() => {
            document.getElementById('receipt-ocr-result').innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    Extracted: ₹250.00 (Food category)
                </div>
                <button class="btn btn-success mt-2" id="save-receipt-btn">
                    <i class="fas fa-save me-2"></i> Save as Expense
                </button>
            `;
            
            document.getElementById('save-receipt-btn').addEventListener('click', function() {
                const today = new Date().toISOString().split('T')[0];
                const newExpense = {
                    id: Date.now(),
                    date: today,
                    category: "Food",
                    amount: 250,
                    description: "From receipt: " + file.name,
                    paymentSource: "UPI",
                    upiBank: "Google Pay"
                };
                
                expenses.push(newExpense);
                saveExpenses();
                updateDashboard();
                displayExpensesList();
                
                // Reset receipt UI
                document.getElementById('receipt-preview').style.display = 'none';
                document.getElementById('receipt-ocr-result').innerHTML = '';
                document.getElementById('receipt-upload').value = '';
                
                showToast('Expense added from receipt!', 'success');
            });
        }, 1500);
    };
    reader.readAsDataURL(file);
}

function exportExpenses() {
    const categoryFilter = document.getElementById('category-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    const filteredExpenses = expenses.filter(expense => {
        const matchesCategory = !categoryFilter || expense.category === categoryFilter;
        const matchesStartDate = !startDate || expense.date >= startDate;
        const matchesEndDate = !endDate || expense.date <= endDate;
        return matchesCategory && matchesStartDate && matchesEndDate;
    });
    
    if (filteredExpenses.length === 0) {
        showToast('No expenses to export', 'warning');
        return;
    }
    
    // Convert to CSV
    let csv = 'Date,Category,Amount,Description,Payment Method,Bank,UPI Bank\n';
    filteredExpenses.forEach(expense => {
        csv += `"${expense.date}","${expense.category}","${expense.amount}","${expense.description || ''}",`;
        csv += `"${expense.paymentSource}","${expense.bank || ''}","${expense.upiBank || ''}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Expenses exported successfully!', 'success');
}

function initCharts() {
    // Category Chart (Doughnut)
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#4361ee', '#3f37c9', '#4cc9f0', '#4895ef',
                    '#560bad', '#b5179e', '#f72585', '#7209b7',
                    '#3a0ca3', '#4361ee'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' },
                title: { display: true, text: 'Expenses by Category' }
            }
        }
    });
    
    // Monthly Trend Chart (Line)
    const monthlyCtx = document.getElementById('monthlyTrendChart').getContext('2d');
    monthlyTrendChart = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Monthly Expenses',
                data: Array(12).fill(0),
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Monthly Trend' } },
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Heatmap Chart (Bar)
    const heatmapCtx = document.getElementById('heatmapChart').getContext('2d');
    heatmapChart = new Chart(heatmapCtx, {
        type: 'bar',
        data: generateHeatmapData(),
        options: {
            responsive: true,
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: { title: { display: true, text: 'Weekly Spending Heatmap' } }
        }
    });
    
    // Update all charts with initial data
    updateCharts();
}

function updateCharts() {
    // Update category chart
    const categories = {};
    expenses.forEach(expense => {
        categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });
    
    categoryChart.data.labels = Object.keys(categories);
    categoryChart.data.datasets[0].data = Object.values(categories);
    categoryChart.update();
    
    // Update monthly trend chart
    const monthlyData = {};
    const currentYear = new Date().getFullYear();
    expenses.forEach(expense => {
        const date = new Date(expense.date);
        if (date.getFullYear() === currentYear) {
            const month = date.getMonth();
            monthlyData[month] = (monthlyData[month] || 0) + expense.amount;
        }
    });
    
    const monthlyValues = [];
    for (let i = 0; i < 12; i++) {
        monthlyValues.push(monthlyData[i] || 0);
    }
    
    monthlyTrendChart.data.datasets[0].data = monthlyValues;
    monthlyTrendChart.update();
    
    // Update heatmap chart
    heatmapChart.data = generateHeatmapData();
    heatmapChart.update();
}

function generateHeatmapData() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeks = Array(5).fill().map(() => Array(7).fill(0));
    
    // Get current month and year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        // Only include expenses from current month
        if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
            const weekOfMonth = Math.floor((expenseDate.getDate() - 1) / 7);
            const dayOfWeek = expenseDate.getDay();
            if (weekOfMonth < 5) {
                weeks[weekOfMonth][dayOfWeek] += expense.amount;
            }
        }
    });
    
    // Calculate max value for color scaling
    const maxValue = Math.max(...weeks.flat());
    
    return {
        labels: days,
        datasets: weeks.map((weekData, i) => ({
            label: `Week ${i+1}`,
            data: weekData,
            backgroundColor: weekData.map(amount => {
                const opacity = maxValue > 0 ? Math.min(0.9, 0.1 + (amount / maxValue) * 0.8) : 0.1;
                return `rgba(67, 97, 238, ${opacity})`;
            }),
            borderColor: 'rgba(67, 97, 238, 0.8)',
            borderWidth: 1
        }))
    };
}

function initCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Generate vibrant colors for categories
    const generateColors = (count) => {
        const colors = [];
        const hueStep = 360 / count;
        for (let i = 0; i < count; i++) {
            colors.push(`hsl(${i * hueStep}, 70%, 60%)`);
        }
        return colors;
    };

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0,
                hoverOffset: 15,
                hoverBorderWidth: 2,
                hoverBorderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        padding: 20,
                        font: {
                            family: 'Poppins',
                            size: 12
                        },
                        color: 'var(--text-color)'
                    }
                },
                title: {
                    display: true,
                    text: 'Spending by Category',
                    font: {
                        family: 'Poppins',
                        size: 16,
                        weight: '600'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    },
                    color: 'var(--text-color)'
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: {
                        family: 'Poppins',
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        family: 'Poppins',
                        size: 12
                    },
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            },
            elements: {
                arc: {
                    borderWidth: 0
                }
            }
        }
    });
}

function updateCategoryChart() {
    // Group expenses by category
    const categories = {};
    expenses.forEach(expense => {
        categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });
    
    // Sort categories by amount (descending)
    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1]);
    
    // Update chart data
    categoryChart.data.labels = sortedCategories.map(item => item[0]);
    categoryChart.data.datasets[0].data = sortedCategories.map(item => item[1]);
    
    // Generate fresh colors based on current categories
    const colors = generateChartColors(sortedCategories.length);
    categoryChart.data.datasets[0].backgroundColor = colors;
    
    // Add animation when updating
    categoryChart.update();
}

function generateChartColors(count) {
    // Generate vibrant but consistent colors
    const baseColors = [
        '#4361ee', '#3f37c9', '#4cc9f0', '#4895ef',
        '#560bad', '#b5179e', '#f72585', '#7209b7',
        '#3a0ca3', '#4bb543', '#ffc107', '#17a2b8'
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

function initHeatmapChart() {
    const ctx = document.getElementById('heatmapChart').getContext('2d');
    heatmapChart = new Chart(ctx, {
        type: 'bar',
        data: generateHeatmapData(),
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '₹' + context.raw.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}




// Utility Functions
function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function saveGoals() {
    localStorage.setItem('goals', JSON.stringify(goals));
}

function getCategoryClass(category) {
    switch(category) {
        case 'Food': return 'category-food';
        case 'Transportation': return 'category-transportation';
        case 'Bank Transfer': return 'category-bank';
        default: return 'category-other';
    }
}

function getPaymentIcon(paymentMethod) {
    switch(paymentMethod) {
        case 'Cash': return 'money-bill-wave';
        case 'Credit Card': return 'credit-card';
        case 'Debit Card': return 'credit-card';
        case 'Net Banking': return 'university';
        case 'UPI': return 'mobile-alt';
        case 'Wallet': return 'wallet';
        case 'Cheque': return 'file-invoice';
        default: return 'money-bill-wave';
    }
}

async function suggestCategory(description) {
    // In a real app, you'd call an API endpoint
    const categories = {
        'uber': 'Transportation',
        'zomato': 'Food',
        'swiggy': 'Food',
        'bigbasket': 'Groceries',
        'amazon': 'Shopping'
    };
    
    const lowerDesc = description.toLowerCase();
    for (const [keyword, category] of Object.entries(categories)) {
        if (lowerDesc.includes(keyword)) {
            return category;
        }
    }
    return 'Other';
}

function showToast(message, type) {
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show`;
    alertEl.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.appendChild(alertEl);
    
    setTimeout(() => alertEl.remove(), 5000);
  }

function showAlert(message, type) {
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show`;
    alertEl.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.appendChild(alertEl);
    
    setTimeout(() => alertEl.remove(), 10000);
}
