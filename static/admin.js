async function sendRequest(url, method, body) {
    const options = { method, headers: { "Content-Type": "application/json" } };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
            showMessage(data.message || "Something went wrong.", true);
            return;
        }
        showMessage(data.message || "Saved.");
        await loadAdminData();
    } catch (error) {
        showMessage("Unable to complete the request. Please try again.", true);
        console.error(error);
    }
}

function showMessage(message, isError = false) {
    const box = document.getElementById("adminMessage");
    if (!box) return;
    box.innerText = message;
    box.className = isError ? "adminMessage error" : "adminMessage";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function loadAdminData() {
    try {
        const response = await fetch("/admin/data");
        const data = await response.json();
        if (!response.ok) {
            showMessage(data.message || "Unable to load admin data.", true);
            return;
        }

        let students = "<tr><th>ID</th><th>Name</th><th>Username</th><th>Action</th></tr>";
        data.students.forEach(student => {
            students += `<tr>
                <td>${student.id}</td>
                <td>${escapeHtml(student.name)}</td>
                <td>${escapeHtml(student.username)}</td>
                <td>
                    <button onclick="editStudent(${student.id})">Edit</button>
                    <button onclick="deleteStudent(${student.id})">Delete</button>
                </td>
            </tr>`;
        });
        document.getElementById("studentsTable").innerHTML = students;

        let instructors = "<tr><th>ID</th><th>Name</th><th>Username</th><th>Password</th><th>Action</th></tr>";
        data.instructors.forEach(instructor => {
            instructors += `<tr>
                <td>${instructor.id}</td>
                <td>${escapeHtml(instructor.name)}</td>
                <td>${escapeHtml(instructor.username)}</td>
                <td>${escapeHtml(instructor.password)}</td>
                <td>
                    <button onclick="editInstructor(${instructor.id})">Edit</button>
                    <button onclick="deleteInstructor(${instructor.id})">Delete</button>
                </td>
            </tr>`;
        });
        document.getElementById("instructorsTable").innerHTML = instructors;

        let courses = "<tr><th>ID</th><th>Course Name</th><th>Time</th><th>Instructor ID</th><th>Action</th></tr>";
        data.courses.forEach(course => {
            courses += `<tr>
                <td>${course.id}</td>
                <td>${escapeHtml(course.course_name)}</td>
                <td>${escapeHtml(course.time)}</td>
                <td>${course.instructor_id || ""}</td>
                <td>
                    <button onclick="editCourse(${course.id})">Edit</button>
                    <button onclick="deleteCourse(${course.id})">Delete</button>
                </td>
            </tr>`;
        });
        document.getElementById("coursesTable").innerHTML = courses;

        let enrollments = "<tr><th>Student ID</th><th>Course ID</th><th>Grade</th><th>Action</th></tr>";
        data.enrollments.forEach(enrollment => {
            const grade = enrollment.grade ?? "";
            enrollments += `<tr>
                <td>${enrollment.student_id}</td>
                <td>${enrollment.course_id}</td>
                <td>${escapeHtml(grade)}</td>
                <td>
                    <button onclick="editEnrollment(${enrollment.student_id}, ${enrollment.course_id}, '${escapeHtml(grade)}')">Edit</button>
                    <button onclick="deleteEnrollment(${enrollment.student_id}, ${enrollment.course_id})">Delete</button>
                </td>
            </tr>`;
        });
        document.getElementById("enrollmentsTable").innerHTML = enrollments;

        window.adminData = data;
    } catch (error) {
        showMessage("Unable to load admin data.", true);
        console.error(error);
    }
}

function addStudent() {
    sendRequest("/admin/students", "POST", {
        name: document.getElementById("studentName").value,
        username: document.getElementById("studentUsername").value,
        password: document.getElementById("studentPassword").value
    });
}

function editStudent(id) {
    const student = window.adminData.students.find(item => item.id === id);
    const name = prompt("Student name:", student.name);
    const username = prompt("Username:", student.username);
    const password = prompt("New password (leave blank to keep the current password):", "");
    if (name !== null && username !== null && password !== null) {
        sendRequest(`/admin/students/${id}`, "PUT", { name, username, password });
    }
}

function deleteStudent(id) {
    if (confirm("Delete this student?")) sendRequest(`/admin/students/${id}`, "DELETE");
}

function addInstructor() {
    sendRequest("/admin/instructors", "POST", {
        name: document.getElementById("instructorName").value,
        username: document.getElementById("instructorUsername").value,
        password: document.getElementById("instructorPassword").value
    });
}

function editInstructor(id) {
    const instructor = window.adminData.instructors.find(item => item.id === id);
    const name = prompt("Instructor name:", instructor.name);
    const username = prompt("Username:", instructor.username);
    const password = prompt("Password:", instructor.password);
    if (name !== null && username !== null && password !== null) {
        sendRequest(`/admin/instructors/${id}`, "PUT", { name, username, password });
    }
}

function deleteInstructor(id) {
    if (confirm("Delete this instructor?")) sendRequest(`/admin/instructors/${id}`, "DELETE");
}

function addCourse() {
    sendRequest("/admin/courses", "POST", {
        course_name: document.getElementById("courseName").value,
        time: document.getElementById("courseTime").value,
        instructor_id: document.getElementById("courseInstructorId").value
    });
}

function editCourse(id) {
    const course = window.adminData.courses.find(item => item.id === id);
    const course_name = prompt("Course name:", course.course_name);
    const time = prompt("Course time:", course.time);
    const instructor_id = prompt("Instructor ID (leave blank if none):", course.instructor_id || "");
    if (course_name !== null && time !== null && instructor_id !== null) {
        sendRequest(`/admin/courses/${id}`, "PUT", { course_name, time, instructor_id });
    }
}

function deleteCourse(id) {
    if (confirm("Delete this course?")) sendRequest(`/admin/courses/${id}`, "DELETE");
}

function addEnrollment() {
    sendRequest("/admin/enrollments", "POST", {
        student_id: document.getElementById("enrollmentStudentId").value,
        course_id: document.getElementById("enrollmentCourseId").value,
        grade: document.getElementById("enrollmentGrade").value
    });
}

function editEnrollment(studentId, courseId, oldGrade) {
    const grade = prompt("Grade:", oldGrade);
    if (grade !== null) sendRequest(`/admin/enrollments/${studentId}/${courseId}`, "PUT", { grade });
}

function deleteEnrollment(studentId, courseId) {
    if (confirm("Delete this enrollment?")) sendRequest(`/admin/enrollments/${studentId}/${courseId}`, "DELETE");
}

async function adminLogout() {
    await fetch("/admin/logout", { method: "POST" });
    window.location.href = "/";
}

loadAdminData();
