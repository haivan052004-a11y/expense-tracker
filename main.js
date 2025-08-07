document.addEventListener('DOMContentLoaded', () => {
    const expenseForm = document.getElementById('expenseForm');
    const expenseTableBody = document.querySelector('#expenseTable tbody');
    const totalSpentElement = document.getElementById('totalSpent');
    const expenseTable = document.getElementById('expenseTable');
    const budgetForm = document.getElementById('budgetForm');
    const budgetInput = document.getElementById('budgetInput');
    const budgetDisplay = document.getElementById('budgetDisplay');
    const budgetWarning = document.getElementById('budgetWarning');
    const categoryChartCanvas = document.getElementById('categoryChart');

    let expenses = [];
    let budget = 0;
    let categoryChart;

    // Lấy các đối tượng Firebase đã khởi tạo từ window
    const database = window.database;
    const ref = window.ref;
    const onValue = window.onValue;
    const push = window.push;
    const remove = window.remove;
    const set = window.set;

    // Lắng nghe thay đổi dữ liệu từ Realtime Database
    const expensesRef = ref(database, 'expenses');
    onValue(expensesRef, (snapshot) => {
        expenses = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const expense = {
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                };
                expenses.push(expense);
            });
        }
        renderApp();
    });

    const budgetRef = ref(database, 'budget');
    onValue(budgetRef, (snapshot) => {
        if (snapshot.exists()) {
            budget = snapshot.val().amount || 0;
        } else {
            budget = 0;
        }
        updateSummary();
    });

    const renderApp = () => {
        renderExpenses();
        updateSummary();
        renderChart();
    };

    const renderExpenses = () => {
        expenseTableBody.innerHTML = '';
        if (expenses.length === 0) {
            expenseTable.classList.add('hidden');
        } else {
            expenseTable.classList.remove('hidden');
        }
        expenses.forEach((expense) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${expense.date}</td>
                <td>${expense.category}</td>
                <td>${expense.amount.toLocaleString('vi-VN')}</td>
                <td>${expense.note}</td>
                <td><button class="delete-button" data-id="${expense.id}">Xóa</button></td>
            `;
            expenseTableBody.appendChild(row);
        });
    };

    const updateSummary = () => {
        let total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        totalSpentElement.textContent = `${total.toLocaleString('vi-VN')} VND`;
        budgetDisplay.textContent = `${budget.toLocaleString('vi-VN')} VND`;
        
        if (budget > 0 && total > budget) {
            budgetWarning.textContent = '⚠️ Đã vượt quá ngân sách!';
            budgetWarning.style.color = '#dc3545';
        } else if (budget > 0) {
            budgetWarning.textContent = `Còn lại: ${(budget - total).toLocaleString('vi-VN')} VND`;
            budgetWarning.style.color = '#28a745';
        } else {
            budgetWarning.textContent = '';
        }
    };

    const renderChart = () => {
        const categoryTotals = expenses.reduce((totals, expense) => {
            totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
            return totals;
        }, {});
        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        const chartData = {
            labels: labels,
            datasets: [{
                label: 'Tổng chi tiêu theo danh mục',
                data: data,
                backgroundColor: 'rgba(0, 123, 255, 0.7)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        };
        const config = {
            type: 'bar',
            data: chartData,
            options: {
                scales: {
                    y: { beginAtZero: true }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        };
        if (categoryChart) {
            categoryChart.destroy();
        }
        categoryChart = new Chart(categoryChartCanvas, config);
    };

    budgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        budget = parseFloat(budgetInput.value);
        set(budgetRef, { amount: budget });
        budgetInput.value = '';
    });

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newExpense = {
            date: document.getElementById('dateInput').value,
            category: document.getElementById('categoryInput').value,
            amount: parseFloat(document.getElementById('amountInput').value),
            note: document.getElementById('noteInput').value,
        };
        push(expensesRef, newExpense);
        expenseForm.reset();
    });

    expenseTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-button')) {
            const expenseId = e.target.getAttribute('data-id');
            const expenseToRemoveRef = ref(database, `expenses/${expenseId}`);
            remove(expenseToRemoveRef);
        }
    });

    renderApp();
});
