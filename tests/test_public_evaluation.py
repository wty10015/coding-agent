import json

from pico.public_evaluation import render_report


def test_public_evaluation_reports_synthetic_readonly_workspace_results():
    report = json.loads(render_report())

    assert report == {
        "cases": [
            {
                "capability": "list visible workspace files",
                "id": "list-visible-files",
                "status": "passed",
            },
            {
                "capability": "read a requested line range",
                "id": "read-line-range",
                "status": "passed",
            },
            {
                "capability": "search visible UTF-8 text",
                "id": "search-visible-text",
                "status": "passed",
            },
            {
                "capability": "reject a path outside the workspace",
                "id": "reject-parent-escape",
                "status": "passed",
            },
            {
                "capability": "reject a Windows absolute path",
                "id": "reject-windows-absolute-path",
                "status": "passed",
            },
            {
                "capability": "reject binary file reads",
                "id": "reject-binary-file",
                "status": "passed",
            },
        ],
        "provenance": "synthetic fixtures constructed by pico.public_evaluation",
        "schema_version": "pico.public-evaluation.v1",
        "scope": "readonly-workspace",
        "summary": {"failed": 0, "passed": 6, "total": 6},
    }
