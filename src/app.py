import argparse
import os
import numpy as np

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="static")

def load_ply(filename):
    with open(filename, "r") as rf:
        while True:
            try:
                line = rf.readline()
            except:
                raise NotImplementedError
            if "end_header" in line:
                break
            if "element vertex" in line:
                arr = line.split()
                num_of_points = int(arr[2])

        # print("%d points in ply file" %num_of_points)
        points = np.zeros([num_of_points, 6])
        for i in range(points.shape[0]):
            point = rf.readline().split()
            assert len(point) == 6
            points[i][0] = float(point[0])
            points[i][1] = float(point[1])
            points[i][2] = float(point[2])
            points[i][3] = float(point[3])
            points[i][4] = float(point[4])
            points[i][5] = float(point[5])
    rf.close()
    del rf
    return points

def list_dir(path, add_parent=False):
    """List directory contents, distinguish between files and directories."""
    files = []
    directories = []
    if add_parent:
        directories.append("..")
    for entry in os.listdir(path):
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            directories.append(entry)
        else:
            files.append(entry)
    return directories, files


@app.route("/")
def index():
    """Serve the main HTML page."""
    return app.send_static_file("index.html")


@app.route("/files")
def files():
    """Return the current directory structure."""
    base_dir = os.path.abspath(app.config.get("base_dir", os.getcwd()))
    path = request.args.get("path", "")
    abs_path = os.path.abspath(os.path.join(base_dir, path))
    if not abs_path.startswith(base_dir):
        return jsonify({"error": "Access denied"}), 403
    if path and not os.path.exists(abs_path):
        return jsonify({"error": "Path does not exist"}), 404

    directories, files = list_dir(abs_path, add_parent=(base_dir != abs_path))
    return jsonify({"directories": directories, "files": files})


@app.route("/static/<path:path>")
def serve_file(path):
    """Serve a file from the static directory."""
    return app.send_static_file(path)

@app.route("/pointcloud/<path:path>")
def pointcloud_server(path):
    global obj_path
    obj_path = path
    points = load_ply(f"{path}")
    xyz = points[:, :3]
    rgb = points[:, 3:6] / 255

    # normalize
    shift = xyz.mean(0)
    scale = np.linalg.norm(xyz - shift, axis=-1).max()
    xyz = (xyz - shift) / scale

    # flatten
    xyz = xyz.flatten()
    rgb = rgb.flatten()

    return jsonify({"xyz": xyz.tolist(), "rgb": rgb.tolist()})


@app.route("/file/<path:path>")
def serve_model(path):
    base_dir = os.path.abspath(app.config.get("base_dir", os.getcwd()))
    return send_from_directory(base_dir, path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-d", "--base_dir", type=str)
    parser.add_argument(
        "--host", type=str, default="0.0.0.0", help="Host to run the web server on"
    )
    parser.add_argument(
        "-p", "--port", type=int, default=5000, help="Port to run the web server on"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        default=False,
        help="Whether to run the web server in debug mode",
    )
    args = parser.parse_args()
    if args.base_dir is not None:
        app.config["base_dir"] = args.base_dir
    app.run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
