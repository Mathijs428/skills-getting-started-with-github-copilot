import copy
import urllib.parse

import pytest
from fastapi.testclient import TestClient

from src import app as app_module

client = TestClient(app_module.app)


@pytest.fixture(autouse=True)
def reset_activities():
    # Snapshot activities before each test and restore afterwards
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(original)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert "michael@mergington.edu" in data["Chess Club"]["participants"]


def test_signup_success():
    email = "alice@example.com"
    path = f"/activities/{urllib.parse.quote('Chess Club')}/signup?email={urllib.parse.quote(email)}"
    resp = client.post(path)
    assert resp.status_code == 200
    assert f"Signed up {email}" in resp.json().get("message", "")

    # verify participant is now present
    activities = client.get("/activities").json()
    assert email in activities["Chess Club"]["participants"]


def test_signup_already_signed_up():
    # michael is already signed up for Chess Club per initial dataset
    email = "michael@mergington.edu"
    path = f"/activities/{urllib.parse.quote('Chess Club')}/signup?email={urllib.parse.quote(email)}"
    resp = client.post(path)
    assert resp.status_code == 400
    assert resp.json().get("detail") == "Student is already signed up"


def test_signup_activity_not_found():
    email = "bob@example.com"
    path = f"/activities/{urllib.parse.quote('Nonexistent')}/signup?email={urllib.parse.quote(email)}"
    resp = client.post(path)
    assert resp.status_code == 404


def test_unregister_success():
    # use an existing participant
    email = "daniel@mergington.edu"
    path = f"/activities/{urllib.parse.quote('Chess Club')}/unregister?email={urllib.parse.quote(email)}"
    resp = client.delete(path)
    assert resp.status_code == 200
    assert f"Unregistered {email}" in resp.json().get("message", "")

    activities = client.get("/activities").json()
    assert email not in activities["Chess Club"]["participants"]


def test_unregister_not_signed():
    email = "not-registered@example.com"
    path = f"/activities/{urllib.parse.quote('Chess Club')}/unregister?email={urllib.parse.quote(email)}"
    resp = client.delete(path)
    assert resp.status_code == 400
    assert resp.json().get("detail") == "Student is not signed up"
