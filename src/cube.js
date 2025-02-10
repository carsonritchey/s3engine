const cube_vertexCount = 24; 

class Cube {
    constructor(pos = [0, 0, 0], scale = [1, 1, 1]) {
        this.pos = vec3.fromValues(pos[0], pos[1], pos[2]);
        this.scale = scale;

        this.matrix = mat4.create();
        mat4.identity(this.matrix);
        mat4.translate(this.matrix, this.matrix, this.pos);

        // temporary
        this.rotationDir = Math.round((Math.random() * 2) - 1);

        mat4.scale(this.matrix, this.matrix, this.scale);
    }
}

const cube_vertices = [
    // front
    -1.0, -1.0, 1.0,
    1.0, -1.0, 1.0,
    1.0, 1.0, 1.0,
    -1.0, 1.0, 1.0,
    // back
    -1.0, -1.0, -1.0,
    -1.0, 1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, -1.0, -1.0,
    // top
    -1.0, 1.0, -1.0,
    -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, -1.0,
    // bottom
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0, 1.0,
    -1.0, -1.0, 1.0,
    // right
    1.0, -1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, 1.0, 1.0,
    1.0, -1.0, 1.0,
    // left
    -1.0, -1.0, -1.0,
    -1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0,
    -1.0, 1.0, -1.0,
];

const cube_textureCoords = [
    // front
    0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0,
    // back
    1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    // top
    0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0,
    // bottom
    0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0,
    // right
    1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    // left
    0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0,
];

const cube_normals = [
    // front
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // back
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    // top
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // bottom
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    // right
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // left
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];


const cube_vertexIndices = [
    // front
    0, 1, 2, 0, 2, 3,
    // back
    4, 5, 6, 4, 6, 7,
    // top
    8, 9, 10, 8, 10, 11,
    // bottom
    12, 13, 14, 12, 14, 15,
    // right
    16, 17, 18, 16, 18, 19,
    // left 
    20, 21, 22, 20, 22, 23,
];