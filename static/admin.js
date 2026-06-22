
async function sendRequest(url, method, body) {
    const options = { method: method, headers: { "Content-Type": "application/json" } };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        showMessage(data.message || "Something went wrong.", true);
        return;
    }

    showMessage(data.message || "Saved.");
    loadAdminData();
}

function showMessage(message, isError = false) {
    const box = document.getElementById("adminMessage");
    box.innerText = message;
    box.className = isError ? "adminMessage error" : "adminMessage";
}

async function loadAdminData() {
    const response = await fetch("/admin/data");
    const data = await response.json();

    let students = "<tr><th>ID</th><th>Name</th><th>Action</th></tr>";
    data.students.forEach(student => {
        students += `<tr>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>
                <button onclick="editStudent(${student.id}, '${student.name}')">Edit</button>
                <button onclick="deleteStudent(${student.id})">Delete</button>
            </td>
        </tr>`;
    });
    document.getElementById("studentsTable").innerHTML = students;

    let instructors = "<tr><th>ID</th><th>Name</th><th>Username</th><th>Password</th><th>Action</th></tr>";
    data.instructors.forEach(instructor => {
        instructors += `<tr>
            <td>${instructor.id}</td>
            <td>${instructor.name}</td>
            <td>${instructor.username}</td>
            <td>${instructor.password}</td>
            <td>
                <button onclick="editInstructor(${instructor.id}, '${instructor.name}', '${instructor.username}', '${instructor.password}')">Edit</button>
                <button onclick="deleteInstructor(${instructor.id})">Delete</button>
            </td>
        </tr>`;
    });
    document.getElementById("instructorsTable").innerHTML = instructors;

    let courses = "<tr><th>ID</th><th>Course Name</th><th>Instructor ID</th><th>Action</th></tr>";
    data.courses.forEach(course => {
        const instructorId = course.instructor_id || "";
        courses += `<tr>
            <td>${course.id}</td>
            <td>${course.course_name}</td>
            <td>${instructorId}</td>
            <td>
                <button onclick="editCourse(${course.id}, '${course.course_name}', '${instructorId}')">Edit</button>
                <button onclick="deleteCourse(${course.id})">Delete</button>
            </td>
        </tr>`;
    });
    document.getElementById("coursesTable").innerHTML = courses;

    let enrollments = "<tr><th>Student ID</th><th>Course ID</th><th>Grade</th><th>Action</th></tr>";
    data.enrollments.forEach(enrollment => {
        enrollments += `<tr>
            <td>${enrollment.student_id}</td>
            <td>${enrollment.course_id}</td>
            <td>${enrollment.grade}</td>
            <td>
                <button onclick="editEnrollment(${enrollment.student_id}, ${enrollment.course_id}, '${enrollment.grade}')">Edit</button>
                <button onclick="deleteEnrollment(${enrollment.student_id}, ${enrollment.course_id})">Delete</button>
            </td>
        </tr>`;
    });
    document.getElementById("enrollmentsTable").innerHTML = enrollments;
}

function addStudent() {
    const name = document.getElementById("studentName").value;
    sendRequest("/admin/students", "POST", { name: name });
}

function editStudent(id, oldName) {
    const name = prompt("Student name:", oldName);
    if (name !== null) sendRequest(`/admin/students/${id}`, "PUT", { name: name });
}

function deleteStudent(id) {
    if (confirm("Delete this student?")) sendRequest(`/admin/students/${id}`, "DELETE");
}

function addInstructor() {
    const name = document.getElementById("instructorName").value;
    const username = document.getElementById("instructorUsername").value;
    const password = document.getElementById("instructorPassword").value;
    sendRequest("/admin/instructors", "POST", { name, username, password });
}

function editInstructor(id, oldName, oldUsername, oldPassword) {
    const name = prompt("Instructor name:", oldName);
    const username = prompt("Username:", oldUsername);
    const password = prompt("Password:", oldPassword);
    if (name !== null && username !== null && password !== null) {
        sendRequest(`/admin/instructors/${id}`, "PUT", { name, username, password });
    }
}

function deleteInstructor(id) {
    if (confirm("Delete this instructor?")) sendRequest(`/admin/instructors/${id}`, "DELETE");
}

function addCourse() {
    const course_name = document.getElementById("courseName").value;
    const instructor_id = document.getElementById("courseInstructorId").value;
    sendRequest("/admin/courses", "POST", { course_name, instructor_id });
}

function editCourse(id, oldName, oldInstructorId) {
    const course_name = prompt("Course name:", oldName);
    const instructor_id = prompt("Instructor ID (leave blank if none):", oldInstructorId);
    if (course_name !== null && instructor_id !== null) {
        sendRequest(`/admin/courses/${id}`, "PUT", { course_name, instructor_id });
    }
}

function deleteCourse(id) {
    if (confirm("Delete this course?")) sendRequest(`/admin/courses/${id}`, "DELETE");
}

function addEnrollment() {
    const student_id = document.getElementById("enrollmentStudentId").value;
    const course_id = document.getElementById("enrollmentCourseId").value;
    const grade = document.getElementById("enrollmentGrade").value;
    sendRequest("/admin/enrollments", "POST", { student_id, course_id, grade });
}

function editEnrollment(studentId, courseId, oldGrade) {
    const grade = prompt("Grade:", oldGrade);
    if (grade !== null) sendRequest(`/admin/enrollments/${studentId}/${courseId}`, "PUT", { grade: grade });
}

function deleteEnrollment(studentId, courseId) {
    if (confirm("Delete this enrollment?")) sendRequest(`/admin/enrollments/${studentId}/${courseId}`, "DELETE");
}

async function adminLogout() {
    await fetch("/admin/logout", { method: "POST" });
    window.location.href = "/";
}

loadAdminData();
