// Login/out Functions
async function login()  {
    const user = document.getElementById("usernameInput").value;
    const pwd = document.getElementById("pwdInput").value;

    const response = await fetch("/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            username: user,
            password: pwd
        })
    });

    const data = await response.json();

    if (response.ok) {
        window.location.href = data.redirect;
    }
    else {
        alert(data.message);
    }
}

async function logout() {
    const response = await fetch("/logout", {
        method: "POST",
        headers: {"Content-Type": "application/json"}
    });

    const data = await response.json();

    if (response.ok) {
        window.location.href = "/";
    } else {
        alert(data.message);
    }
}

// Instructor Functions
async function loadInstructorCourse()   {
    const response = await fetch("/courses");
    if (!response.ok) {
        alert("Failed to load courses");
        return;
    }
    const data = await response.json();

    let btnState = document.getElementById("exitBtn");  // Set Logout Button
    btnState.innerHTML = `
        <button onclick="logout()">
            Log Out
        </button>
    `;
    let table = document.getElementById("tableDisplay");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Course Name</th>
                <th>Time</th>
                <th>Capacity</th>
            </tr>
        </thead>
    `;

    data.forEach(course => {   // Add teacher's course(s) data to table html
        table.innerHTML += `
        <tr>
            <td>${course.name}</td>
            <td>${course.time}</td>
            <td>${course.enrolled}/${course.capacity}</td>
            <td>
                <button onclick="loadCourseStudents('${course.id}')">
                    View Students
                </button>
            </td>
        </tr>
        `;
    });
}

async function loadCourseStudents(course_id)   {
    const response = await fetch(`/courses/${encodeURIComponent(course_id)}/students`);
    if (!response.ok) {
        alert("Failed to load enrollment");
        return;
    }
    const data = await response.json();

    let btnState = document.getElementById("exitBtn");  // Set Go Back button
    btnState.innerHTML = `
        <button onclick="loadInstructorCourse()">
            Go Back
        </button>
    `;

    let table = document.getElementById("tableDisplay");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Grade</th>
                <th>Edit</th>
            </tr>
        </thead>
    `;

    data.forEach(student => {   // Add course enrollment list to table html
        table.innerHTML += `
        <tr>
            <td>${student.name}</td>
            <td>${student.grade}</td>
            <td>
                <button onclick="editGrade(${course_id}, ${student.student_id})">
                    Edit Grade
                </button>
            </td>
        </tr>
        `;

    });
}

async function editGrade(course_id, student_id) {
    const newGrade = prompt(    // Ask for new grade input
        `Enter new grade`
    );

    if (newGrade === null) {    // Do nothing if empty input
        return;
    }

    const temp = parseFloat(newGrade); // Verify valid grade input
    if (isNaN(temp || temp < 0 || temp > 100)) {
        alert("Invalid grade");
        return;
    }

    const response = await fetch(`/courses/${encodeURIComponent(course_id)}/students/${encodeURIComponent(student_id)}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            grade: parseFloat(newGrade)
        })
    });

    const data = await response.json();

    if (response.ok) {
        loadCourseStudents(course_id);
    } else {
        alert(data.message);
    }
}

// Student Functions
async function loadStudentEnrolledCourses() {
    const response = await fetch("/student/enrolled-courses");
    if (!response.ok) {
        alert("Failed to load enrolled courses");
        return;
    }

    const data = await response.json();

    let table = document.getElementById("enrolledCoursesTable");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Course Name</th>
                <th>Teacher</th>
                <th>Grade</th>
                <th>Action</th>
            </tr>
        </thead>
    `;

    if (data.length === 0) {
        table.innerHTML += `
            <tr>
                <td colspan="4" style="text-align: center;">No courses enrolled</td>
            </tr>
        `;
    } else {
        data.forEach(course => {
            const gradeDisplay = course.grade !== null ? course.grade : "TBD";
            table.innerHTML += `
            <tr>
                <td>${course.name}</td>
                <td>${course.teacher}</td>
                <td>${gradeDisplay}</td>
                <td>
                    <button onclick="unenrollCourse(${course.id})">Remove</button>
                </td>
            </tr>
            `;
        });
    }
}

async function loadStudentAvailableCourses() {
    const response = await fetch("/student/available-courses");
    if (!response.ok) {
        alert("Failed to load available courses");
        return;
    }

    const data = await response.json();

    let table = document.getElementById("availableCoursesTable");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Course Name</th>
                <th>Teacher</th>
                <th>Time</th>
                <th>Students Enrolled</th>
                <th>Add class</th>
            </tr>
        </thead>
    `;

    data.forEach(course => {
        let buttonHTML = "";
        if (course.already_enrolled) {
            buttonHTML = `<button disabled style="background-color: gray; cursor: not-allowed;">Enrolled</button>`;
        } else if (course.can_enroll) {
            buttonHTML = `<button onclick="enrollCourse(${course.id})">+</button>`;
        } else {
            buttonHTML = `<button disabled style="background-color: red; cursor: not-allowed;">Full</button>`;
        }

        table.innerHTML += `
        <tr>
            <td>${course.name}</td>
            <td>${course.teacher}</td>
            <td>TBD</td>
            <td>${course.enrolled}/${course.capacity}</td>
            <td>
                ${buttonHTML}
            </td>
        </tr>
        `;
    });
}

async function enrollCourse(course_id) {
    const response = await fetch(`/student/enroll/${course_id}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"}
    });

    const data = await response.json();

    if (response.ok) {
        alert(data.message);
        loadStudentEnrolledCourses();
        loadStudentAvailableCourses();
    } else {
        alert(data.message);
    }
}

async function unenrollCourse(course_id) {
    if (!confirm("Are you sure you want to remove this course?")) {
        return;
    }

    const response = await fetch(`/student/unenroll/${course_id}`, {
        method: "DELETE",
        headers: {"Content-Type": "application/json"}
    });

    const data = await response.json();

    if (response.ok) {
        alert(data.message);
        loadStudentEnrolledCourses();
        loadStudentAvailableCourses();
    } else {
        alert(data.message);
    }
}