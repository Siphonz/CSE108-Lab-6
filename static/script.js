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
         window.location.href = "/instructor";
        // loadInstructorCourse();
    }
    else {
        alert(data.message);
    }
}

async function loadInstructorCourse()   {
    const response = await fetch("/courses");
    if (!response.ok) {
        alert("Failed to load courses");
        return;
    }

    const data = await response.json();

    let table = document.getElementById("tableDisplay");
    table.innerHTML = `
        <thead>
            <tr>
                <th>Course Name</th>
            </tr>
        </thead>
    `;

    data.forEach(course => {   // Add teacher's course(s) data to table html
        table.innerHTML += `
        <tr>
            <td>${course.name}</td>
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

    data.forEach(student => {
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