/* Composed, Not Observed — web edition 0.0.7: the sky computation.
   A line-for-line port of the functions in the deposited script sky_1889.py
   (julian_day, gmst_deg, lst_deg, alt_az, obliquity, sun_radec, project,
   procrustes). No new method: check_site.py runs this file under node and
   compares its results with the deposited data files.
   Works in the browser (window.SKY) and in node (module.exports). */
(function (root) {
  "use strict";
  var d2r = Math.PI / 180, r2d = 180 / Math.PI;
  var LAT = -(22 + 54 / 60 + 24 / 3600), LON = -(43 + 10 / 60 + 21 / 3600);
  function mod(a, n) { return ((a % n) + n) % n; }

  function julianDay(y, m, d, hours) {
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100), b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5 + hours / 24;
  }
  function gmstDeg(jd) {
    var t = (jd - 2451545.0) / 36525;
    return mod(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t - t * t * t / 38710000, 360);
  }
  /* local mean time at Rio on a date of 1889 -> Julian day */
  function jdForLmt(y, m, d, lmtHours) { return julianDay(y, m, d, lmtHours - LON / 15); }
  function lstDeg(jd, lon) { return mod(gmstDeg(jd) + (lon == null ? LON : lon), 360); }
  function altAz(ra, dec, lst, lat) {
    var h = mod(lst - ra, 360) * d2r, phi = (lat == null ? LAT : lat) * d2r, d = dec * d2r;
    var alt = Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(h));
    var az = Math.atan2(-Math.cos(d) * Math.sin(h), Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.sin(phi) * Math.cos(h));
    return [alt * r2d, mod(az * r2d, 360)];
  }
  function obliquity(jd) { return 23.439291 - 0.0130042 * (jd - 2451545.0) / 36525; }
  /* Meeus, Astronomical Algorithms, ch. 25, low precision */
  function sunRaDec(jd) {
    var t = (jd - 2451545.0) / 36525;
    var l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    var m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    var c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m * d2r) + (0.019993 - 0.000101 * t) * Math.sin(2 * m * d2r) + 0.000289 * Math.sin(3 * m * d2r);
    var lam = mod(l0 + c, 360), eps = obliquity(jd) * d2r;
    var ra = mod(Math.atan2(Math.cos(eps) * Math.sin(lam * d2r), Math.cos(lam * d2r)) * r2d, 360);
    var dec = Math.asin(Math.sin(eps) * Math.sin(lam * d2r)) * r2d;
    return [ra, dec, lam];
  }
  /* Zenith-centred azimuthal projection as seen from inside the sphere, south at
     the bottom (east on the left); the horizon at radius 1. */
  function project(alt, az, kind) {
    var zd = (90 - alt) * d2r, r;
    if (kind === "orthographic") r = Math.sin(zd);
    else if (kind === "stereographic") r = Math.tan(zd / 2) / Math.tan(Math.PI / 4);
    else if (kind === "equidistant") r = zd / (Math.PI / 2);
    else throw new Error(kind);
    var a = az * d2r;
    return [-r * Math.sin(a), r * Math.cos(a)];
  }
  /* Least-squares similarity transform taking src to dst (2-D); reflect = true
     mirrors src (x -> -x) first. Returns rms, scale, rotation (deg), the
     transform and the fitted points. */
  function procrustes(src, dst, reflect, fixTranslation) {
    var n = src.length, s = src.map(function (p) { return reflect ? [-p[0], p[1]] : [p[0], p[1]]; });
    var cs = [0, 0], cd = [0, 0], i;
    if (!fixTranslation) {
      for (i = 0; i < n; i++) { cs[0] += s[i][0] / n; cs[1] += s[i][1] / n; cd[0] += dst[i][0] / n; cd[1] += dst[i][1] / n; }
    }
    var a = 0, b = 0, den = 0;
    for (i = 0; i < n; i++) {
      var x = s[i][0] - cs[0], y = s[i][1] - cs[1], u = dst[i][0] - cd[0], v = dst[i][1] - cd[1];
      a += x * u + y * v; b += x * v - y * u; den += x * x + y * y;
    }
    var rot = Math.atan2(b, a), scale = Math.hypot(a, b) / den, co = Math.cos(rot), si = Math.sin(rot);
    function apply(p) {
      var x = (reflect ? -p[0] : p[0]) - cs[0], y = p[1] - cs[1];
      return [cd[0] + scale * (x * co - y * si), cd[1] + scale * (x * si + y * co)];
    }
    var fitted = src.map(apply), ss = 0;
    for (i = 0; i < n; i++) ss += Math.pow(fitted[i][0] - dst[i][0], 2) + Math.pow(fitted[i][1] - dst[i][1], 2);
    return { rms: Math.sqrt(ss / n), scale: scale, rot: rot * r2d, apply: apply, fitted: fitted };
  }
  /* The sun's altitude at Rio for a local mean time on a date of 1889 */
  function sunAltAz(y, m, d, lmt) {
    var jd = jdForLmt(y, m, d, lmt), s = sunRaDec(jd);
    return altAz(s[0], s[1], lstDeg(jd));
  }

  root.SKY = { LAT: LAT, LON: LON, julianDay: julianDay, gmstDeg: gmstDeg, jdForLmt: jdForLmt, lstDeg: lstDeg,
    altAz: altAz, obliquity: obliquity, sunRaDec: sunRaDec, sunAltAz: sunAltAz, project: project, procrustes: procrustes };
  if (typeof module !== "undefined" && module.exports) module.exports = root.SKY;
})(typeof window !== "undefined" ? window : globalThis);
