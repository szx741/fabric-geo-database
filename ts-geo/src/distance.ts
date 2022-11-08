//地球半径
const EARTH_RADIUS = 6378137;

//弧度转换为角度
function toDegrees(angleInRadians: number) {
    return (angleInRadians * 180) / Math.PI;
}

//角度转换为弧度
function toRadians(angleInDegrees: number) {
    return (angleInDegrees * Math.PI) / 180;
}

/**
 *  获取两个地理坐标之间的大圆距离（米）。
 * @param {Array} c1 开始坐标
 * @param {Array} c2 结束坐标
 * @param {number} [opt_radius] 球体半径，默认为地球半径
 * @return {number} 距离（米）
 */
function getDistance(c1: Array<number>, c2: Array<number>, opt_radius: number = EARTH_RADIUS): number {
    const radius = opt_radius;
    const lat1 = toRadians(c1[1]);
    const lat2 = toRadians(c2[1]);
    const deltaLatBy2 = (lat2 - lat1) / 2;
    const deltaLonBy2 = toRadians(c2[0] - c1[0]) / 2;
    const a = Math.pow(Math.sin(deltaLatBy2), 2) + Math.pow(Math.sin(deltaLonBy2), 2) * Math.cos(lat1) * Math.cos(lat2);
    return 2 * radius * Math.asin(Math.sqrt(a));
}

/**
 * 给定一个点和距离，取得正方形的两个对角点
 * https://blog.csdn.net/qq_40807739/article/details/83056064
 * @param longitude
 * @param latitude
 * @param dis
 * @returns
 */

function getPoiRange(longitude: number, latitude: number, dis: number) {
    const lat = toRadians(latitude);
    const theta = dis / EARTH_RADIUS;
    // 维度相同，反算经度
    const elng = Math.acos((Math.cos(theta) - Math.pow(Math.sin(lat), 2)) / Math.pow(Math.cos(lat), 2));
    const elng1 = toDegrees(-elng) + longitude;
    const elng2 = toDegrees(elng) + longitude;
    // 经度相同，反算维度
    const elat1 = toDegrees(-theta) + latitude;
    const elat2 = toDegrees(theta) + latitude;

    const poi: Array<Array<number>> = [];
    poi.push([elng1, elat1]);
    poi.push([elng2, elat2]);

    return poi;
}

export { getDistance, getPoiRange, EARTH_RADIUS };
