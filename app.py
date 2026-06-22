from flask import Flask, jsonify, request, render_template, session
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

    instructor = Instructor.query.filter_by(
        username=data["username"]
    ).first()

    if instructor and instructor.password == data["password"]:
        session["instructor_id"] = instructor.id

        return jsonify({
            "message": "Login successful"
        }), 200

    return jsonify({
        "message": "Invalid credentials"
    }), 401

# POST /logout
@app.route("/logout", methods=["POST"])
def logout():

    session.pop("instructor_id", None)

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

if __name__ == "__main__":
    app.run(debug=True)