/*
 * @Author: szx
 * @Date: 2021-11-03 19:40:28
 * @LastEditTime: 2021-11-07 18:44:12
 * @Description:
 * @FilePath: /commercial-paper/caliper-workspace/workload/randomCreate.js
 */
const fs = require('fs')
const { position, point, lineString, polygon } = require('geojson-random');
// const bbox = [115.25, 39.28, 117.35, 41.03];
const bbox = [116.19, 39.84, 116.54, 40.03];

function randomPoint() {
    const arr = position(bbox);
    arr[0] = Number(arr[0].toFixed(6));
    arr[1] = Number(arr[1].toFixed(6));
    return arr;
}

function singlePoint() {
    const arr = position(bbox);
    const res = 'POINT(' + arr[0].toFixed(6) + ' ' + arr[1].toFixed(6) + ')';
    return res;
}
// console.log(singlePoint());

function randomPoints(count) {
    // const bbox = [115.25, 39.28, 117.35, 41.03];
    const arr = point(count, bbox).features;
    arr.map((item) => {
        item.geometry.coordinates[0] = Number(item.geometry.coordinates[0].toFixed(6));
        item.geometry.coordinates[1] = Number(item.geometry.coordinates[1].toFixed(6));
    });
    return arr;
}
// console.log(randomPoints(3));

function randomLineString(count) {
    // const bbox = [115.25, 39.28, 117.35, 41.03];
    const num_vertices = 100;
    const max_length = 0.003;
    const max_rotation = Math.PI / 8;
    const res = lineString(count, num_vertices, max_length, max_rotation, bbox).features;
    res.map((item) => {
        item.geometry.coordinates.map((i) => {
            i[0] = Number(i[0].toFixed(6));
            i[1] = Number(i[1].toFixed(6));
        });
    });
    return res;
}
// console.log(randomLineString(3)[0].geometry.coordinates);

function randomPolygon(count) {
    // const bbox = [115.25, 39.28, 117.35, 41.03];
    const num_vertices = 100;
    const max_radial_length = 0.02;
    //  随机生成点
    const res = polygon(count, num_vertices, max_radial_length, bbox).features;
    res.map((item) => {
        item.geometry.coordinates[0].map((i) => {
            i[0] = Number(i[0].toFixed(6));
            i[1] = Number(i[1].toFixed(6));
        });
    });
    return res;
}
// console.log(randomPolygon(3)[0].geometry.coordinates[0]);

function singlePolygon() {
    // const bbox = [115.25, 39.28, 117.35, 41.03];
    const num_vertices = 4;
    const max_radial_length = 0.01;
    //  随机生成点
    let str_polygon = '';
    const res = polygon(1, num_vertices, max_radial_length, bbox).features;
    res.map((item) => {
        let str = '';
        item.geometry.coordinates[0].map((i) => {
            i[0] = i[0].toFixed(6);
            i[1] = i[1].toFixed(6);
            str +=
                JSON.stringify(i)
                    .replace(/\]|\[|"/g, '')
                    .replace(',', ' ') + ',';
        });
        str_polygon += 'POLYGON((' + str.substr(0, str.length - 1) + '))';
    });

    return str_polygon;
}

// console.log(singlePolygon());

function randomRadius(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


function circleSQL() {
    const value = singlePoint();
    const radius = randomRadius(500, 5000).toString();
    return `SELECT gid, ST_AsText (geom) as geom FROM mychannel_geo WHERE ST_DWithin (geom, ST_Transform(ST_GeomFromText('SRID=4326;${value}'), 4796), ${radius}) LIMIT 200;`;
    // return `SELECT gid, ST_AsText (geom) as geom FROM mychannel_geo WHERE ST_DWithin (geom, ST_Transform(ST_GeomFromText('SRID=4326;${value}'), 4796), ${radius});`;
    // return `SELECT gid, ST_AsText (geom) as geom FROM mychannel_geo WHERE ST_Distance(geom,ST_geomfromText('${value}', 4326),true)<=${radius};`;
    // return `SELECT gid, ST_AsText (geom) as geom FROM mychannel_geo WHERE ST_Distance(geom,ST_geomfromText('${value}', 4326),true)<=${radius};`;
}

function intersectsSQL() {
    // const value = singleLineString();
    const value = singlePolygon();
    return `SELECT gid, ST_AsText (geom) as geom FROM mychannel_geo WHERE ST_Intersects (geom, ST_Transform(ST_geomfromText ('${value}', 4326),4796)) LIMIT 200;`;
}
// console.log(intersectsSQL());

function knnSQL() {
    // const value = singlePolygon();
    const value = singlePoint();
    return `SELECT gid, ST_AsText (geom) as geom FROM mychannel_geo ORDER BY geom <-> ST_Transform(ST_geomfromText ('${value}', 4326),4796) LIMIT 200;`;
}

function importLineString(){
    // const json =fs.readFileSync('linestring_features_2.geojson')
    const json =fs.readFileSync('polygon_features_2.geojson')
    const geojson  = JSON.parse(json.toString());
    const arr = geojson.features;
    return arr;
    // console.log(arr)
}
// importLineString();
module.exports = {
    singlePolygon,
    singlePoint,
    randomPoints,
    randomLineString,
    randomPolygon,
    randomPoint,
    randomRadius,
    circleSQL,
    intersectsSQL,
    knnSQL,
    importLineString
};
// console.log(intersectsSQL())