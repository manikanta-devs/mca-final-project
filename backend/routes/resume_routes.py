from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import logging

from services.resume_service import ResumeService
from utils.auth_utils import token_required

logger = logging.getLogger(__name__)
resume_bp = Blueprint("resume", __name__)
resume_service = ResumeService()

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_file_content(filepath):
    try:
        with open(filepath, "rb") as f:
            header = f.read(4)
        # PDF magic bytes: %PDF
        if header.startswith(b"%PDF"):
            return True
        # DOCX magic bytes: PK\x03\x04 (zip archive)
        if header.startswith(b"PK\x03\x04"):
            return True
        # TXT: read and verify it's valid UTF-8/ASCII without null bytes
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            chunk = f.read(1024)
            if "\x00" in chunk:
                return False
        return True
    except Exception:
        return False


@resume_bp.route("/resume/upload", methods=["POST"])
@token_required
def upload_resume():
    """Upload and analyze a resume file"""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return (
                jsonify(
                    {
                        "error": f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
                    }
                ),
                400,
            )

        import uuid
        filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)

        # Enforce content magic-byte checks
        if not validate_file_content(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
            return jsonify({"error": "Invalid file content. The file type does not match its extension."}), 400

        from pydantic import ValidationError
        from validators import ResumeUploadRequest
        try:
            ResumeUploadRequest(job_description=request.form.get("job_description"))
        except ValidationError as val_err:
            return jsonify({"error": "Validation failed", "message": val_err.errors()}), 400

        logger.info(f"Processing resume: {filename}")
        result = resume_service.analyze_resume(filepath)

        # Clean up uploaded file
        try:
            os.remove(filepath)
        except Exception:
            pass

        job_description = request.form.get("job_description", "").strip()
        job_match = None
        if job_description:
            job_match = resume_service.compare_resume_to_job(result, job_description)

        response = {"success": True, "filename": filename, "analysis": result}
        if job_match:
            response["job_match"] = job_match

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Resume upload error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@resume_bp.route("/resume/analyze-text", methods=["POST"])
@token_required
def analyze_text():
    """Analyze plain text resume"""
    try:
        data = request.get_json()
        if not data or "text" not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data["text"].strip()
        if len(text) < 50:
            return (
                jsonify({"error": "Resume text too short (minimum 50 characters)"}),
                400,
            )

        result = resume_service.analyze_text(text)
        response = {"success": True, "analysis": result}

        job_description = (data.get("job_description") or "").strip()
        if job_description:
            response["job_match"] = resume_service.compare_resume_to_job(
                result, job_description
            )

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Text analysis error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@resume_bp.route("/resume/match-job", methods=["POST"])
@token_required
def match_resume_to_job():
    """Compare analyzed resume data against a job description."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        resume_data = data.get("resume_data")
        job_description = (data.get("job_description") or "").strip()

        if not resume_data:
            return jsonify({"error": "Resume data required"}), 400
        if len(job_description) < 30:
            return jsonify({"error": "Job description too short"}), 400

        match = resume_service.compare_resume_to_job(resume_data, job_description)
        return jsonify({"success": True, "job_match": match}), 200

    except Exception as e:
        logger.error(f"Job match error: {e}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e) if current_app.config.get("ENV") == "development" else "An error occurred"
        }), 500


@resume_bp.route("/resume/roles", methods=["GET"])
@token_required
def get_roles():
    """Get available interview roles"""
    roles = [
        {"id": "software_engineer", "label": "Software Engineer", "icon": "code"},
        {"id": "frontend_developer", "label": "Frontend Developer", "icon": "palette"},
        {"id": "backend_developer", "label": "Backend Developer", "icon": "settings"},
        {
            "id": "fullstack_developer",
            "label": "Full Stack Developer",
            "icon": "wrench",
        },
        {"id": "data_scientist", "label": "Data Scientist", "icon": "bar-chart"},
        {"id": "ml_engineer", "label": "ML Engineer", "icon": "brain"},
        {"id": "devops_engineer", "label": "DevOps Engineer", "icon": "rocket"},
        {"id": "product_manager", "label": "Product Manager", "icon": "clipboard"},
        {"id": "ui_ux_designer", "label": "UI/UX Designer", "icon": "target"},
        {"id": "cybersecurity", "label": "Cybersecurity Engineer", "icon": "shield"},
        {"id": "cloud_engineer", "label": "Cloud Engineer", "icon": "cloud"},
        {"id": "mobile_developer", "label": "Mobile Developer", "icon": "smartphone"},
    ]
    return jsonify({"roles": roles}), 200
