from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config["SECRET_KEY"] = "my-secret-key"  

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///grades.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {
            "name": self.name,
        }

class Instructor(db.Model):
    __tablename__ = "instructors"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    username = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(255))
    
class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    course_name = db.Column(db.String(100))

    instructor_id = db.Column(
        db.Integer,
        db.ForeignKey("instructors.id")
    )

class Enrollment(db.Model):
    __tablename__ = "enrollments"

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
        primary_key=True
    )

    course_id = db.Column(
        db.Integer,
        db.ForeignKey("courses.id"),
        primary_key=True
    )

    grade = db.Column(db.Float)

with app.app_context():
    db.create_all()

    if not Instructor.query.first():

        instructor = Instructor(
            name="John Smith",
            username="jsmith",
            password="password"
        )

        db.session.add(instructor)
        db.session.commit()

        course = Course(
            course_name="CS101",
            instructor_id=instructor.id
        )

        db.session.add(course)

        student1 = Student(name="Alice")
        student2 = Student(name="Bob")

        db.session.add(student1)
        db.session.add(student2)
        db.session.commit()

        db.session.add(
            Enrollment(
                student_id=student1.id,
                course_id=course.id,
                grade=95
            )
        )

        db.session.add(
            Enrollment(
                student_id=student2.id,
                course_id=course.id,
                grade=87
            )
        )

        db.session.commit()

# with app.app_context():
#     db.create_all()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/instructor")
def instructor_page():

    if "instructor_id" not in session:
        return redirect("/")

    return render_template("instructor.html")

# POST /login
@app.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    if not data:
        return jsonify({
            "message": "Missing request body"
        }), 400

    username = data.get("username", "")
    password = data.get("password", "")

    # When the admin credentials are used, send the user to the admin dashboard.
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session.pop("instructor_id", None)
        session["admin_logged_in"] = True
        return jsonify({
            "message": "Admin login successful",
            "redirect": "/admin"
        }), 200

    instructor = Instructor.query.filter_by(username=username).first()

    if instructor and instructor.password == password:
        session.pop("admin_logged_in", None)
        session["instructor_id"] = instructor.id

        return jsonify({
            "message": "Login successful",
            "redirect": "/instructor"
        }), 200

    return jsonify({
        "message": "Invalid credentials"
    }), 401

# POST /logout
@app.route("/logout", methods=["POST"])
def logout():

    session.pop("instructor_id", None)
    session.pop("admin_logged_in", None)

    return jsonify({
        "message": "Logged out"
    })

# GET /courses
@app.route("/courses", methods=["GET"])
def get_courses():

    instructor_id = session.get("instructor_id")

    if not instructor_id:
        return jsonify({
            "message": "Not logged in"
        }), 401

    courses = Course.query.filter_by(
        instructor_id=instructor_id
    ).all()

    result = []

    for course in courses:
        result.append({
            "id": course.id,
            "name": course.course_name
        })

    return jsonify(result)

# GET /courses/<course_id>/students
@app.route("/courses/<int:course_id>/students")
def get_students(course_id):

    instructor_id = session.get("instructor_id")

    if not instructor_id:
        return jsonify({
            "message": "Not logged in"
        }), 401

    course = Course.query.filter_by(id=course_id, instructor_id=session["instructor_id"]).first()
    if not course:
        return jsonify({
            "message": "Course not found"
        }), 404

    rows = (
        db.session.query(
            Student.id,
            Student.name,
            Enrollment.grade
        )
        .join(
            Enrollment,
            Student.id == Enrollment.student_id
        )
        .filter(
            Enrollment.course_id == course_id
        )
        .all()
    )

    result = []

    for row in rows:
        result.append({
            "student_id": row.id,
            "name": row.name,
            "grade": row.grade
        })

    return jsonify(result)


# POST /courses/<course_id>/students/<student_id>
@app.route(
    "/courses/<int:course_id>/students/<int:student_id>",
    methods=["PUT"]
)
def update_grade(course_id, student_id):

    instructor_id = session.get("instructor_id")

    if not instructor_id:
        return jsonify({
            "message": "Not logged in"
        }), 401

    course = Course.query.filter_by(id=course_id, instructor_id=session["instructor_id"]).first()
    if not course:
        return jsonify({
            "message": "Course not found"
        }), 404

    data = request.get_json()

    if not data or "grade" not in data:
        return jsonify({
            "message": "Missing grade"
        }), 400

    enrollment = Enrollment.query.filter_by(
        course_id=course_id,
        student_id=student_id
    ).first()

    if not enrollment:
        return jsonify({
            "message": "Enrollment not found"
        }), 404

    enrollment.grade = data["grade"]

    db.session.commit()

    return jsonify({
        "message": "Grade updated"
    })

# Admin login and routes
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


def admin_required():
    """Returns a JSON error when an admin is not logged in."""
    if not session.get("admin_logged_in"):
        return jsonify({"message": "Admin login required"}), 401
    return None


@app.route("/admin/login", methods=["GET"])
def admin_login_page():
    # Admin login is now handled from the normal login page.
    if session.get("admin_logged_in"):
        return redirect(url_for("admin_page"))
    return redirect(url_for("home"))


@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Missing request body"}), 400

    username = data.get("username", "")
    password = data.get("password", "")

    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session["admin_logged_in"] = True
        return jsonify({"message": "Admin login successful"}), 200

    return jsonify({"message": "Invalid admin username or password"}), 401


@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("admin_logged_in", None)
    return jsonify({"message": "Admin logged out"})


@app.route("/admin")
def admin_page():
    if not session.get("admin_logged_in"):
        return redirect(url_for("admin_login_page"))
    return render_template("admin.html")


@app.route("/admin/data", methods=["GET"])
def admin_data():
    error = admin_required()
    if error:
        return error

    students = [{"id": student.id, "name": student.name} for student in Student.query.order_by(Student.id).all()]
    instructors = [{
        "id": instructor.id,
        "name": instructor.name,
        "username": instructor.username,
        "password": instructor.password
    } for instructor in Instructor.query.order_by(Instructor.id).all()]
    courses = [{
        "id": course.id,
        "course_name": course.course_name,
        "instructor_id": course.instructor_id
    } for course in Course.query.order_by(Course.id).all()]
    enrollments = [{
        "student_id": enrollment.student_id,
        "course_id": enrollment.course_id,
        "grade": enrollment.grade
    } for enrollment in Enrollment.query.order_by(Enrollment.course_id, Enrollment.student_id).all()]

    return jsonify({
        "students": students,
        "instructors": instructors,
        "courses": courses,
        "enrollments": enrollments
    })


@app.route("/admin/students", methods=["POST"])
def admin_add_student():
    error = admin_required()
    if error:
        return error
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"message": "Student name is required"}), 400
    if Student.query.filter_by(name=name).first():
        return jsonify({"message": "Student name already exists"}), 400
    db.session.add(Student(name=name))
    db.session.commit()
    return jsonify({"message": "Student added"}), 201


@app.route("/admin/students/<int:student_id>", methods=["PUT"])
def admin_edit_student(student_id):
    error = admin_required()
    if error:
        return error
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"message": "Student not found"}), 404
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"message": "Student name is required"}), 400
    existing = Student.query.filter(Student.name == name, Student.id != student_id).first()
    if existing:
        return jsonify({"message": "Student name already exists"}), 400
    student.name = name
    db.session.commit()
    return jsonify({"message": "Student updated"})


@app.route("/admin/students/<int:student_id>", methods=["DELETE"])
def admin_delete_student(student_id):
    error = admin_required()
    if error:
        return error
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"message": "Student not found"}), 404
    Enrollment.query.filter_by(student_id=student_id).delete()
    db.session.delete(student)
    db.session.commit()
    return jsonify({"message": "Student deleted"})


@app.route("/admin/instructors", methods=["POST"])
def admin_add_instructor():
    error = admin_required()
    if error:
        return error
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    if not name or not username or not password:
        return jsonify({"message": "Name, username, and password are required"}), 400
    if Instructor.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 400
    db.session.add(Instructor(name=name, username=username, password=password))
    db.session.commit()
    return jsonify({"message": "Instructor added"}), 201


@app.route("/admin/instructors/<int:instructor_id>", methods=["PUT"])
def admin_edit_instructor(instructor_id):
    error = admin_required()
    if error:
        return error
    instructor = db.session.get(Instructor, instructor_id)
    if not instructor:
        return jsonify({"message": "Instructor not found"}), 404
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    if not name or not username or not password:
        return jsonify({"message": "Name, username, and password are required"}), 400
    existing = Instructor.query.filter(Instructor.username == username, Instructor.id != instructor_id).first()
    if existing:
        return jsonify({"message": "Username already exists"}), 400
    instructor.name = name
    instructor.username = username
    instructor.password = password
    db.session.commit()
    return jsonify({"message": "Instructor updated"})


@app.route("/admin/instructors/<int:instructor_id>", methods=["DELETE"])
def admin_delete_instructor(instructor_id):
    error = admin_required()
    if error:
        return error
    instructor = db.session.get(Instructor, instructor_id)
    if not instructor:
        return jsonify({"message": "Instructor not found"}), 404
    if Course.query.filter_by(instructor_id=instructor_id).first():
        return jsonify({"message": "Cannot delete an instructor who is assigned to a course"}), 400
    db.session.delete(instructor)
    db.session.commit()
    return jsonify({"message": "Instructor deleted"})


def get_instructor_id(value):
    """Turns an optional Instructor ID into an int or None."""
    if value is None or str(value).strip() == "":
        return None
    try:
        instructor_id = int(value)
    except (TypeError, ValueError):
        return "invalid"
    return instructor_id


@app.route("/admin/courses", methods=["POST"])
def admin_add_course():
    error = admin_required()
    if error:
        return error
    data = request.get_json() or {}
    course_name = data.get("course_name", "").strip()
    instructor_id = get_instructor_id(data.get("instructor_id"))
    if not course_name:
        return jsonify({"message": "Course name is required"}), 400
    if instructor_id == "invalid":
        return jsonify({"message": "Instructor ID must be a number"}), 400
    if instructor_id is not None and not db.session.get(Instructor, instructor_id):
        return jsonify({"message": "Instructor not found"}), 404
    db.session.add(Course(course_name=course_name, instructor_id=instructor_id))
    db.session.commit()
    return jsonify({"message": "Course added"}), 201


@app.route("/admin/courses/<int:course_id>", methods=["PUT"])
def admin_edit_course(course_id):
    error = admin_required()
    if error:
        return error
    course = db.session.get(Course, course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    data = request.get_json() or {}
    course_name = data.get("course_name", "").strip()
    instructor_id = get_instructor_id(data.get("instructor_id"))
    if not course_name:
        return jsonify({"message": "Course name is required"}), 400
    if instructor_id == "invalid":
        return jsonify({"message": "Instructor ID must be a number"}), 400
    if instructor_id is not None and not db.session.get(Instructor, instructor_id):
        return jsonify({"message": "Instructor not found"}), 404
    course.course_name = course_name
    course.instructor_id = instructor_id
    db.session.commit()
    return jsonify({"message": "Course updated"})


@app.route("/admin/courses/<int:course_id>", methods=["DELETE"])
def admin_delete_course(course_id):
    error = admin_required()
    if error:
        return error
    course = db.session.get(Course, course_id)
    if not course:
        return jsonify({"message": "Course not found"}), 404
    Enrollment.query.filter_by(course_id=course_id).delete()
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted"})


@app.route("/admin/enrollments", methods=["POST"])
def admin_add_enrollment():
    error = admin_required()
    if error:
        return error
    data = request.get_json() or {}
    try:
        student_id = int(data.get("student_id"))
        course_id = int(data.get("course_id"))
        grade = float(data.get("grade"))
    except (TypeError, ValueError):
        return jsonify({"message": "Student ID, course ID, and grade must be numbers"}), 400
    if not db.session.get(Student, student_id) or not db.session.get(Course, course_id):
        return jsonify({"message": "Student or course not found"}), 404
    if Enrollment.query.filter_by(student_id=student_id, course_id=course_id).first():
        return jsonify({"message": "Enrollment already exists"}), 400
    db.session.add(Enrollment(student_id=student_id, course_id=course_id, grade=grade))
    db.session.commit()
    return jsonify({"message": "Enrollment added"}), 201


@app.route("/admin/enrollments/<int:student_id>/<int:course_id>", methods=["PUT"])
def admin_edit_enrollment(student_id, course_id):
    error = admin_required()
    if error:
        return error
    enrollment = Enrollment.query.filter_by(student_id=student_id, course_id=course_id).first()
    if not enrollment:
        return jsonify({"message": "Enrollment not found"}), 404
    data = request.get_json() or {}
    try:
        enrollment.grade = float(data.get("grade"))
    except (TypeError, ValueError):
        return jsonify({"message": "Grade must be a number"}), 400
    db.session.commit()
    return jsonify({"message": "Enrollment updated"})


@app.route("/admin/enrollments/<int:student_id>/<int:course_id>", methods=["DELETE"])
def admin_delete_enrollment(student_id, course_id):
    error = admin_required()
    if error:
        return error
    enrollment = Enrollment.query.filter_by(student_id=student_id, course_id=course_id).first()
    if not enrollment:
        return jsonify({"message": "Enrollment not found"}), 404
    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({"message": "Enrollment deleted"})


if __name__ == "__main__":
    app.run(debug=True)
