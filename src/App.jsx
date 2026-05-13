import { useEffect, useMemo, useRef, useState } from "react";  
import * as topojson from 'topojson-client';
import * as d3 from 'd3';

const API = import.meta.env.VITE_RENDER_URL || "";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  LoginScreen,
  SignupScreen,
  ForgotPasswordScreen,
  OtpVerifyScreen,
  NewPasswordScreen,
} from "./AuthScreens";
import { runIDW, IDWPanel, meltingChartEstimate } from "./IDWModule";
import DatePicker from "./DatePicker";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { autoTable } from "jspdf-autotable";

const CURRENT_YEAR = new Date().getFullYear();
// ── WSR-88D Radar Site Lookup Table ──────────────────────────────────────────
const WSR88D_SITES = {
  KABR:{lat:45.4558,lon:-98.4132,elev:1302},KABX:{lat:35.1497,lon:-106.8239,elev:5870},
  KAKQ:{lat:36.9839,lon:-77.0073,elev:112},KAMA:{lat:35.2333,lon:-101.7092,elev:3587},
  KAMX:{lat:25.6111,lon:-80.4128,elev:14},KAPX:{lat:44.9072,lon:-84.7197,elev:1464},
  KARX:{lat:43.8228,lon:-91.1912,elev:1276},KATX:{lat:48.1945,lon:-122.4958,elev:494},
  KBBX:{lat:39.4957,lon:-121.6316,elev:173},KBGM:{lat:42.1997,lon:-75.9847,elev:1606},
  KBHX:{lat:40.4986,lon:-124.2919,elev:2326},KBIS:{lat:46.7708,lon:-100.7603,elev:1658},
  KBLX:{lat:45.8537,lon:-108.6068,elev:3598},KBMX:{lat:33.1722,lon:-86.7697,elev:645},
  KBOX:{lat:41.9558,lon:-71.1372,elev:118},KBRO:{lat:25.9161,lon:-97.4189,elev:23},
  KBUF:{lat:42.9489,lon:-78.7369,elev:693},KBYX:{lat:24.5975,lon:-81.7033,elev:8},
  KCAE:{lat:33.9488,lon:-81.1181,elev:231},KCBW:{lat:46.0392,lon:-67.8067,elev:746},
  KCBX:{lat:43.4906,lon:-116.2356,elev:3061},KCCX:{lat:40.9228,lon:-78.0036,elev:2405},
  KCLE:{lat:41.4132,lon:-81.8597,elev:763},KCLX:{lat:32.6553,lon:-81.0422,elev:165},
  KCRP:{lat:27.7839,lon:-97.5111,elev:45},KCXX:{lat:44.5111,lon:-73.1661,elev:317},
  KCYS:{lat:41.1519,lon:-104.8061,elev:6128},KDAX:{lat:38.5011,lon:-121.6778,elev:30},
  KDDC:{lat:37.7608,lon:-99.9686,elev:2590},KDFX:{lat:29.2731,lon:-100.2803,elev:1131},
  KDGX:{lat:32.2797,lon:-89.9844,elev:623},KDLH:{lat:46.8369,lon:-92.2097,elev:1428},
  KDMX:{lat:41.7311,lon:-93.7228,elev:981},KDOX:{lat:38.8257,lon:-75.4400,elev:50},
  KDTX:{lat:42.6997,lon:-83.4717,elev:1072},KDVN:{lat:41.6117,lon:-90.5808,elev:754},
  KDYX:{lat:32.5386,lon:-99.2544,elev:1517},KEAX:{lat:38.8103,lon:-94.2644,elev:995},
  KEMX:{lat:31.8936,lon:-110.6303,elev:5202},KENX:{lat:42.5864,lon:-74.0639,elev:1826},
  KEOX:{lat:31.4603,lon:-85.4594,elev:444},KEPZ:{lat:31.8731,lon:-106.6983,elev:4104},
  KESX:{lat:35.7011,lon:-114.8919,elev:4867},KEVX:{lat:30.5644,lon:-85.9214,elev:140},
  KEWX:{lat:29.7039,lon:-98.0281,elev:909},KEYX:{lat:35.0978,lon:-117.5608,elev:2757},
  KFCX:{lat:37.0242,lon:-80.2742,elev:2868},KFDR:{lat:34.3622,lon:-98.9764,elev:1267},
  KFFC:{lat:33.3636,lon:-84.5658,elev:858},KFSD:{lat:43.5878,lon:-96.7294,elev:1429},
  KFSX:{lat:34.5744,lon:-111.1983,elev:7247},KFTG:{lat:39.7867,lon:-104.5458,elev:5497},
  KFWS:{lat:32.5728,lon:-97.3031,elev:686},KGGW:{lat:48.2064,lon:-106.6247,elev:2278},
  KGJX:{lat:39.0622,lon:-108.2139,elev:9992},KGLD:{lat:39.3667,lon:-101.7003,elev:3651},
  KGRB:{lat:44.4986,lon:-88.1111,elev:682},KGRK:{lat:30.7217,lon:-97.3828,elev:538},
  KGRR:{lat:42.8939,lon:-85.5447,elev:778},KGSP:{lat:34.8833,lon:-82.2203,elev:940},
  KGWX:{lat:33.8967,lon:-88.3292,elev:476},KGYX:{lat:43.8913,lon:-70.2569,elev:399},
  KHDX:{lat:33.0769,lon:-106.1228,elev:4222},KHGX:{lat:29.4719,lon:-95.0792,elev:18},
  KHNX:{lat:36.3142,lon:-119.6322,elev:243},KHPX:{lat:36.7369,lon:-87.2847,elev:576},
  KHTX:{lat:34.9306,lon:-86.0836,elev:1760},KICT:{lat:37.6544,lon:-97.4428,elev:1335},
  KICX:{lat:37.5908,lon:-112.8622,elev:10600},KILN:{lat:39.4203,lon:-83.8217,elev:1056},
  KILX:{lat:40.1506,lon:-89.3367,elev:582},KIND:{lat:39.7075,lon:-86.2803,elev:790},
  KINX:{lat:36.1750,lon:-95.5644,elev:668},KIWA:{lat:33.2892,lon:-111.6700,elev:1353},
  KIWX:{lat:41.4086,lon:-85.7000,elev:960},KJAX:{lat:30.4847,lon:-81.7019,elev:33},
  KJGX:{lat:32.6756,lon:-83.3511,elev:521},KJKL:{lat:37.5908,lon:-83.3131,elev:1364},
  KLBB:{lat:33.6541,lon:-101.8139,elev:3259},KLCH:{lat:30.1253,lon:-93.2158,elev:13},
  KLIX:{lat:30.3367,lon:-89.8253,elev:24},KLNX:{lat:41.9578,lon:-100.5758,elev:2970},
  KLOT:{lat:41.6044,lon:-88.0847,elev:663},KLRX:{lat:40.7397,lon:-116.8028,elev:6699},
  KLSX:{lat:38.6986,lon:-90.6828,elev:608},KLTX:{lat:33.9894,lon:-78.4292,elev:64},
  KLVX:{lat:37.9753,lon:-85.9439,elev:719},KLWX:{lat:38.9753,lon:-77.4778,elev:272},
  KLZK:{lat:34.8364,lon:-92.2619,elev:568},KMAF:{lat:31.9433,lon:-102.1894,elev:2868},
  KMAX:{lat:42.0811,lon:-122.7172,elev:7513},KMBX:{lat:48.3925,lon:-100.8644,elev:1490},
  KMHX:{lat:34.7761,lon:-76.8764,elev:31},KMKX:{lat:42.9678,lon:-88.5506,elev:958},
  KMLB:{lat:28.1133,lon:-80.6542,elev:99},KMOB:{lat:30.6797,lon:-88.2397,elev:208},
  KMPX:{lat:44.8489,lon:-93.5653,elev:946},KMQT:{lat:46.5311,lon:-87.5483,elev:1411},
  KMRX:{lat:36.1686,lon:-83.4017,elev:1353},KMSX:{lat:47.0411,lon:-113.9861,elev:7855},
  KMTX:{lat:41.2628,lon:-112.4478,elev:6493},KMUX:{lat:37.1553,lon:-121.8983,elev:3465},
  KMVX:{lat:47.5278,lon:-97.3253,elev:986},KMXX:{lat:32.5367,lon:-85.7897,elev:400},
  KNKX:{lat:32.9189,lon:-117.0419,elev:955},KNQA:{lat:35.3447,lon:-89.8733,elev:282},
  KOAX:{lat:41.3203,lon:-96.3667,elev:1148},KOHX:{lat:36.2472,lon:-86.5625,elev:579},
  KOKX:{lat:40.8656,lon:-72.8639,elev:85},KOTX:{lat:47.6803,lon:-117.6258,elev:2384},
  KPAH:{lat:37.0683,lon:-88.7719,elev:392},KPBZ:{lat:40.5317,lon:-80.2178,elev:1185},
  KPDT:{lat:45.6906,lon:-118.8528,elev:1515},KPOE:{lat:31.1556,lon:-92.9758,elev:408},
  KPUX:{lat:38.4595,lon:-104.1814,elev:5249},KRAX:{lat:35.6656,lon:-78.4897,elev:348},
  KRGX:{lat:39.7542,lon:-119.4611,elev:8299},KRIW:{lat:43.0661,lon:-108.4772,elev:5568},
  KRLX:{lat:38.3111,lon:-81.7228,elev:1080},KRMX:{lat:43.4678,lon:-75.4578,elev:1513},
  KSFX:{lat:43.1056,lon:-112.6861,elev:4474},KSGF:{lat:37.2353,lon:-93.4006,elev:1278},
  KSHV:{lat:32.4508,lon:-93.8411,elev:273},KSJT:{lat:31.3714,lon:-100.4922,elev:1890},
  KSOX:{lat:33.8175,lon:-117.6361,elev:3027},KSRX:{lat:35.2908,lon:-94.3619,elev:638},
  KTBW:{lat:27.7056,lon:-82.4017,elev:41},KTFX:{lat:47.4597,lon:-111.3856,elev:3714},
  KTLH:{lat:30.3975,lon:-84.3289,elev:63},KTLX:{lat:35.3331,lon:-97.2778,elev:1213},
  KTWX:{lat:38.9969,lon:-96.2325,elev:1367},KTYX:{lat:43.7558,lon:-75.6800,elev:1846},
  KUDX:{lat:44.1250,lon:-102.8297,elev:3016},KUEX:{lat:40.3211,lon:-98.4417,elev:1976},
  KVAX:{lat:30.8903,lon:-83.0019,elev:178},KVBX:{lat:34.8381,lon:-120.3978,elev:1233},
  KVNX:{lat:36.7408,lon:-98.1278,elev:1210},KVTX:{lat:34.4117,lon:-119.1797,elev:3005},
  KVWX:{lat:38.2603,lon:-87.7247,elev:407},KYUX:{lat:32.4953,lon:-114.6561,elev:174},
};

// ── Beam geometry calculator ──────────────────────────────────────────────────
function getBeamGeometry(propLat, propLon, radarId) {
  const site = WSR88D_SITES[radarId];
  if (!site) return null;

  const R = 3958.8; // Earth radius miles
  const dLat = ((site.lat - propLat) * Math.PI) / 180;
  const dLon = ((site.lon - propLon) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(propLat*Math.PI/180)*Math.cos(site.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  const distMi = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distFt = distMi * 5280;

  const Re = 20902000; // Effective Earth radius ft (4/3 refraction)
  const elev = site.elev; // ft

  // Beam center at 0.5° elevation
  const thetaCenter = 0.5 * Math.PI / 180;
  const beamCenter = Math.round(Math.sqrt(distFt**2 + Re**2 + 2*distFt*Re*Math.sin(thetaCenter)) - Re + elev);

  // Beam bottom at 0° (half beamwidth below center)
  const thetaBottom = 0 * Math.PI / 180;
  const beamBottom = Math.round(Math.sqrt(distFt**2 + Re**2 + 2*distFt*Re*Math.sin(thetaBottom)) - Re + elev);

  // Beam width at distance (1° beamwidth)
  const beamWidth = Math.round(2 * distFt * Math.tan(0.5 * Math.PI / 180));

  // Reliability
  let reliability, color;
  if (beamCenter < 15000) { reliability = "reliable"; color = "#4caf50"; }
  else if (beamCenter < 25000) { reliability = "marginal"; color = "#ffb04d"; }
  else { reliability = "questionable"; color = "#ff6b6b"; }

  return {
    radarId,
    distMi: distMi.toFixed(1),
    beamCenter: beamCenter.toLocaleString(),
    beamBottom: beamBottom.toLocaleString(),
    beamWidth: beamWidth.toLocaleString(),
    reliability,
    color,
  };
}
// ── US State FIPS Lookup ──────────────────────────────────────────────────────
const STATE_FIPS = {
  "ALABAMA":"01","ALASKA":"02","ARIZONA":"04","ARKANSAS":"05",
  "CALIFORNIA":"06","COLORADO":"08","CONNECTICUT":"09","DELAWARE":"10",
  "FLORIDA":"12","GEORGIA":"13","HAWAII":"15","IDAHO":"16",
  "ILLINOIS":"17","INDIANA":"18","IOWA":"19","KANSAS":"20",
  "KENTUCKY":"21","LOUISIANA":"22","MAINE":"23","MARYLAND":"24",
  "MASSACHUSETTS":"25","MICHIGAN":"26","MINNESOTA":"27","MISSISSIPPI":"28",
  "MISSOURI":"29","MONTANA":"30","NEBRASKA":"31","NEVADA":"32",
  "NEW HAMPSHIRE":"33","NEW JERSEY":"34","NEW MEXICO":"35","NEW YORK":"36",
  "NORTH CAROLINA":"37","NORTH DAKOTA":"38","OHIO":"39","OKLAHOMA":"40",
  "OREGON":"41","PENNSYLVANIA":"42","RHODE ISLAND":"44","SOUTH CAROLINA":"45",
  "SOUTH DAKOTA":"46","TENNESSEE":"47","TEXAS":"48","UTAH":"49",
  "VERMONT":"50","VIRGINIA":"51","WASHINGTON":"53","WEST VIRGINIA":"54",
  "WISCONSIN":"55","WYOMING":"56"
};

// ── NEXRAD Hail Map Page ──────────────────────────────────────────────────────
function HailMapPage({ data, nexradHits = [], inspections = [], preview = false }) {
  const svgRef = useRef(null);
  const [mapStatus, setMapStatus] = useState("loading");

  const propLat = parseFloat(data?.location?.lat || 0);
  const propLon = parseFloat(data?.location?.lon || 0);
  const stateName = (data?.location?.state || "").toUpperCase();
  const MAP_W = 750;
  const MAP_H = 520;

  useEffect(() => {
    if (!svgRef.current || !stateName) return;
    let cancelled = false;

    async function renderMap() {
      try {
        const usData = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json').then(r => r.json());
        if (cancelled) return;

        const fips = STATE_FIPS[stateName];
        if (!fips) { setMapStatus("error"); return; }

        const states = topojson.feature(usData, usData.objects.states);
        const counties = topojson.feature(usData, usData.objects.counties);

        const stateFeature = states.features.find(f => String(f.id).padStart(2,'0') === fips);
        if (!stateFeature) { setMapStatus("error"); return; }

        const stateCounties = {
          type: "FeatureCollection",
          features: counties.features.filter(f => String(f.id).padStart(5,'0').slice(0,2) === fips)
        };

        const projection = d3.geoAlbers().fitExtent([[20,20],[MAP_W-20,MAP_H-20]], stateFeature);
        const path = d3.geoPath().projection(projection);

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Defs
        const defs = svg.append("defs");
        const gf = defs.append("filter").attr("id","swi-glow").attr("x","-50%").attr("y","-50%").attr("width","200%").attr("height","200%");
        gf.append("feGaussianBlur").attr("stdDeviation","4").attr("result","blur");
        const m1 = gf.append("feMerge");
        m1.append("feMergeNode").attr("in","blur");
        m1.append("feMergeNode").attr("in","SourceGraphic");

        const bf = defs.append("filter").attr("id","blue-glow").attr("x","-100%").attr("y","-100%").attr("width","300%").attr("height","300%");
        bf.append("feGaussianBlur").attr("stdDeviation","5").attr("result","blur");
        const m2 = bf.append("feMerge");
        m2.append("feMergeNode").attr("in","blur");
        m2.append("feMergeNode").attr("in","SourceGraphic");

        // Background
        svg.append("rect").attr("width",MAP_W).attr("height",MAP_H).attr("fill","#020609");

        // County fills
        svg.selectAll(".county").data(stateCounties.features).join("path")
          .attr("d", path)
          .attr("fill","#040c18")
          .attr("stroke","rgba(23,50,95,0.9)")
          .attr("stroke-width",0.6);

        // State glow outline
        svg.append("path").datum(stateFeature).attr("d",path)
          .attr("fill","none").attr("stroke","rgba(118,168,255,0.25)")
          .attr("stroke-width",8).attr("filter","url(#swi-glow)");
        svg.append("path").datum(stateFeature).attr("d",path)
          .attr("fill","none").attr("stroke","#76a8ff")
          .attr("stroke-width",1.5);

        // NEXRAD hits — deduplicate by location, size by magnitude
        const hitsByLoc = {};
        nexradHits.forEach(h => {
          const key = `${parseFloat(h.lat).toFixed(1)}_${parseFloat(h.lon).toFixed(1)}`;
          if (!hitsByLoc[key] || parseFloat(h.maxSizeIn) > parseFloat(hitsByLoc[key].maxSizeIn)) {
            hitsByLoc[key] = h;
          }
        });
        Object.values(hitsByLoc).forEach(hit => {
          const coords = projection([parseFloat(hit.lon), parseFloat(hit.lat)]);
          if (!coords) return;
          const [x,y] = coords;
          const r = Math.max(3, Math.min(9, parseFloat(hit.maxSizeIn) * 3.5));
          svg.append("circle").attr("cx",x).attr("cy",y).attr("r",r+4)
            .attr("fill","rgba(76,175,80,0.1)").attr("stroke","none");
          svg.append("circle").attr("cx",x).attr("cy",y).attr("r",r)
            .attr("fill","rgba(76,175,80,0.55)").attr("stroke","#4caf50").attr("stroke-width",0.8);
        });

        // Radar towers — yellow triangles with labels
        const radarsShown = [...new Set(nexradHits.map(h => h.radar).filter(Boolean))];
        radarsShown.forEach(radarId => {
          const site = WSR88D_SITES[radarId];
          if (!site) return;
          const coords = projection([site.lon, site.lat]);
          if (!coords) return;
          const [x,y] = coords;
          const s = 7;
          svg.append("polygon")
            .attr("points",`${x},${y-s} ${x-s*0.866},${y+s*0.5} ${x+s*0.866},${y+s*0.5}`)
            .attr("fill","rgba(255,176,77,0.8)").attr("stroke","#ffb04d").attr("stroke-width",1);
          svg.append("text").attr("x",x+10).attr("y",y+3)
            .attr("fill","#ffb04d").attr("font-size",7)
            .attr("font-family",'"IBM Plex Mono", monospace').text(radarId);
        });

        // 25-mile radius ring
        const propCoords = projection([propLon, propLat]);
        if (propCoords) {
          const [px, py] = propCoords;

          // Calculate 25 miles in pixel space by projecting a point 25mi north
          const milesPerDegLat = 69.0;
          const offsetLat = propLat + (25 / milesPerDegLat);
          const offsetCoords = projection([propLon, offsetLat]);
          if (offsetCoords) {
            const ringRadius = Math.abs(py - offsetCoords[1]);
            svg.append("circle").attr("cx",px).attr("cy",py).attr("r",ringRadius)
              .attr("fill","none")
              .attr("stroke","rgba(118,168,255,0.5)")
              .attr("stroke-width",1.2)
              .attr("stroke-dasharray","5,3");
            svg.append("text").attr("x",px+ringRadius+4).attr("y",py+3)
              .attr("fill","rgba(118,168,255,0.7)")
              .attr("font-size",8)
              .attr("font-family",'"IBM Plex Mono", monospace')
              .text("25 mi");
          }

          // Trinity Engineering PE-Verified inspection pins — blue triangles
        inspections.forEach(insp => {
          if (!insp.lat || !insp.lon) return;
          const coords = projection([insp.lon, insp.lat]);
          if (!coords) return;
          const [x, y] = coords;
          const s = 6;
          svg.append("polygon")
            .attr("points", `${x},${y-s} ${x-s*0.866},${y+s*0.5} ${x+s*0.866},${y+s*0.5}`)
            .attr("fill", "rgba(0,0,205,0.8)")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1);
        });
          // Property pin
          svg.append("circle").attr("cx",px).attr("cy",py).attr("r",20)
            .attr("fill","rgba(118,168,255,0.1)").attr("stroke","rgba(118,168,255,0.25)").attr("stroke-width",1);
          svg.append("circle").attr("cx",px).attr("cy",py).attr("r",7)
            .attr("fill","#76a8ff").attr("stroke","#ffffff").attr("stroke-width",2)
            .attr("filter","url(#blue-glow)");
        }

        if (!cancelled) setMapStatus("ready");
      } catch(err) {
        console.error("Map render error:", err);
        if (!cancelled) setMapStatus("error");
      }
    }

    renderMap();
    return () => { cancelled = true; };
  }, [stateName, propLat, propLon, nexradHits.length]);

  return (
    <PdfPageShell showTopHeader={false} preview={preview}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div>
          <div style={{ color:theme.muted2, fontSize:9, letterSpacing:"0.15em", fontFamily:'"IBM Plex Mono", monospace', textTransform:"uppercase", marginBottom:3 }}>
            10-Year NEXRAD Hail Detection Pattern · {data?.stats?.yearsSearched || "2016–2026"}
          </div>
          <div style={{ color:theme.text, fontWeight:700, fontSize:14 }}>
            {data?.location?.county}, {data?.location?.state}
          </div>
        </div>
        <div style={{ display:"flex", gap:16, alignItems:"center", fontFamily:'"IBM Plex Mono", monospace', fontSize:9, color:theme.muted2 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#76a8ff", border:"1.5px solid #fff" }} />
            Property
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"rgba(76,175,80,0.6)", border:"1px solid #4caf50" }} />
            NEXRAD Hit
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderBottom:"9px solid #ffb04d" }} />
            WSR-88D Radar
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderBottom:"9px solid #76a8ff" }} />
            PE-Verified Inspection
          </div>
        </div>
      </div>

      <div style={{ background:"#020609", border:`1px solid ${theme.border}`, borderRadius:8, overflow:"hidden" }}>
        {mapStatus === "loading" && (
          <div style={{ width:MAP_W, height:MAP_H, display:"flex", alignItems:"center", justifyContent:"center", color:theme.muted2, fontFamily:'"IBM Plex Mono", monospace', fontSize:11 }}>
            Loading map data...
          </div>
        )}
        {mapStatus === "error" && (
          <div style={{ width:MAP_W, height:MAP_H, display:"flex", alignItems:"center", justifyContent:"center", color:theme.muted2, fontFamily:'"IBM Plex Mono", monospace', fontSize:11 }}>
            Map unavailable
          </div>
        )}
        <svg ref={svgRef} width={MAP_W} height={MAP_H} style={{ display: mapStatus==="ready" ? "block" : "none" }} />
      </div>

      <div style={{ marginTop:10, color:theme.muted2, fontSize:9, fontFamily:'"IBM Plex Mono", monospace', letterSpacing:"0.08em" }}>
        NEXRAD hits shown within 0.5° radius (~35 mi) of subject property · Maximum detected hail size aloft per location · WSR-88D sites that detected events shown
      </div>
    </PdfPageShell>
  );
}
// ── DOL NEXRAD Map (recent hail history, date-colored) ───────────────────────
function DolNexradMap({ data, nexradHits = [], dateOfLoss, idwResult = null, freezeLevelFt = null, inspections = [], mapOnly = false }) {
  const svgRef = useRef(null);
  const [mapStatus, setMapStatus] = useState("loading");

  const propLat = parseFloat(data?.location?.lat || 0);
  const propLon = parseFloat(data?.location?.lon || 0);
  const MAP_W = 700;
  const MAP_H = 380;

  // Parse DOL
  const [dolYear, dolMonth, dolDay] = dateOfLoss ? dateOfLoss.split("-").map(Number) : [0,0,0];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dolFormatted = dateOfLoss ? `${String(dolDay).padStart(2,"0")}-${months[dolMonth-1]}-${dolYear}` : null;

  // Date range: 1 year before DOL to today
  const dolDateObj = dateOfLoss ? new Date(dolYear, dolMonth-1, dolDay) : null;
  const oneYearBefore = dolDateObj ? new Date(dolDateObj.getTime() - 365*24*60*60*1000) : null;
  const today = new Date();

  // Filter and classify hits
  const classifiedHits = nexradHits.filter(h => {
    if (!h.date) return false;
    const parts = h.date.split("-");
    if (parts.length !== 3) return false;
    const monthIdx = months.indexOf(parts[1]);
    if (monthIdx === -1) return false;
    const hDate = new Date(parseInt(parts[2]), monthIdx, parseInt(parts[0]));
    return hDate >= oneYearBefore && hDate <= today;
  }).map(h => {
    const parts = h.date.split("-");
    const monthIdx = months.indexOf(parts[1]);
    const hDate = new Date(parseInt(parts[2]), monthIdx, parseInt(parts[0]));
    let category;
    if (h.date === dolFormatted) category = "dol";
    else if (hDate < dolDateObj) category = "before";
    else category = "after";
    const labelDate = `${parts[2]}.${String(monthIdx+1).padStart(2,"0")}.${parts[0].padStart(2,"0")}`;
    return { ...h, category, labelDate, hDate };
  });

  const colorMap = {
    dol:    { fill: "rgba(0,220,255,0.65)", stroke: "#00dcff", text: "#00dcff" },
    before: { fill: "rgba(255,176,77,0.65)", stroke: "#ffb04d", text: "#ffb04d" },
    after:  { fill: "rgba(255,100,80,0.65)", stroke: "#ff6450", text: "#ff6450" },
  };

  const dateRangeLabel = oneYearBefore && dolDateObj
    ? `${oneYearBefore.getFullYear()}.${String(oneYearBefore.getMonth()+1).padStart(2,"0")}.${String(oneYearBefore.getDate()).padStart(2,"0")} — ${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,"0")}.${String(today.getDate()).padStart(2,"0")}`
    : "";

  useEffect(() => {
    if (!svgRef.current || !dateOfLoss) return;
    let cancelled = false;

    async function renderMap() {
      try {
        const usData = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json').then(r => r.json());
        if (cancelled) return;

        const stateName = (data?.location?.state || "").toUpperCase();
        const fips = STATE_FIPS[stateName];
        const counties = topojson.feature(usData, usData.objects.counties);
        const stateCounties = fips ? {
          type: "FeatureCollection",
          features: counties.features.filter(f => String(f.id).padStart(5,'0').slice(0,2) === fips)
        } : { type: "FeatureCollection", features: [] };

        const pad = 0.75;
        const bboxFeature = {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [propLon-pad, propLat-pad], [propLon+pad, propLat-pad],
              [propLon+pad, propLat+pad], [propLon-pad, propLat+pad],
              [propLon-pad, propLat-pad]
            ]]
          }
        };

        const projection = d3.geoMercator()
          .center([propLon, propLat])
          .scale(MAP_W * 55)
          .translate([MAP_W / 2, MAP_H / 2]);
        const path = d3.geoPath().projection(projection);

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Defs
        const defs = svg.append("defs");
        const wf = defs.append("filter").attr("id","dol-white-glow").attr("x","-100%").attr("y","-100%").attr("width","300%").attr("height","300%");
        wf.append("feGaussianBlur").attr("stdDeviation","4").attr("result","blur");
        const mw = wf.append("feMerge");
        mw.append("feMergeNode").attr("in","blur");
        mw.append("feMergeNode").attr("in","SourceGraphic");

        // Background
        svg.append("rect").attr("width",MAP_W).attr("height",MAP_H).attr("fill","#020609");

        // County fills
        svg.selectAll(".county").data(stateCounties.features).join("path")
          .attr("d", path).attr("fill","#040c18")
          .attr("stroke","rgba(23,50,95,0.9)").attr("stroke-width",0.6);

        // Distance rings
        const propCoords = projection([propLon, propLat]);
        if (propCoords) {
          const [px, py] = propCoords;
          [5, 10, 15, 25].forEach(miles => {
            const offsetCoords = projection([propLon, propLat + (miles/69.0)]);
            if (!offsetCoords) return;
            const ringRadius = Math.abs(py - offsetCoords[1]);
            const isMain = miles === 25;
            svg.append("circle").attr("cx",px).attr("cy",py).attr("r",ringRadius)
              .attr("fill","none")
              .attr("stroke","rgba(118,168,255,0.5)")
              .attr("stroke-width",1.2)
              .attr("stroke-dasharray","5,3");
            svg.append("text").attr("x",px+ringRadius+4).attr("y",py+3)
              .attr("fill","rgba(118,168,255,0.7)")
              .attr("font-size",8)
              .attr("font-family",'"IBM Plex Mono", monospace').text(`${miles} mi`);
          });
        }

        // NEXRAD hits — sorted so DOL renders on top
        const sortOrder = { before: 0, after: 1, dol: 2 };
        const sorted = [...classifiedHits].sort((a,b) => sortOrder[a.category] - sortOrder[b.category]);

        sorted.forEach(hit => {
          const coords = projection([parseFloat(hit.lon), parseFloat(hit.lat)]);
          if (!coords) return;
          const [x, y] = coords;
          const r = 6;
          const c = colorMap[hit.category];
          svg.append("circle").attr("cx",x).attr("cy",y).attr("r",r+4)
            .attr("fill",`${c.fill.replace("0.65","0.1")}`).attr("stroke","none");
          svg.append("circle").attr("cx",x).attr("cy",y).attr("r",r)
            .attr("fill",c.fill).attr("stroke",c.stroke).attr("stroke-width",1);
          // Date label
          svg.append("text").attr("x",x).attr("y",y-r-3)
            .attr("fill",c.text).attr("font-size",6).attr("text-anchor","middle")
            .attr("font-family",'"IBM Plex Mono", monospace').text(hit.labelDate);
          // Size label below
          svg.append("text").attr("x",x).attr("y",y+r+8)
            .attr("fill",c.text).attr("font-size",6).attr("text-anchor","middle")
            .attr("font-family",'"IBM Plex Mono", monospace').text(`${hit.maxSizeIn}"`);
        });

        // Radar towers
        const radarsShown = [...new Set(classifiedHits.map(h => h.radar).filter(Boolean))];
        radarsShown.forEach(radarId => {
          const site = WSR88D_SITES[radarId];
          if (!site) return;
          const coords = projection([site.lon, site.lat]);
          if (!coords) return;
          const [x, y] = coords;
          const s = 7;
          svg.append("polygon")
            .attr("points",`${x},${y-s} ${x-s*0.866},${y+s*0.5} ${x+s*0.866},${y+s*0.5}`)
            .attr("fill","rgba(255,176,77,0.8)").attr("stroke","#ffb04d").attr("stroke-width",1);
          svg.append("text").attr("x",x+10).attr("y",y+3)
            .attr("fill","#ffb04d").attr("font-size",7)
            .attr("font-family",'"IBM Plex Mono", monospace').text(radarId);
        });

        // Trinity PE-Verified inspection pins — blue triangles
        inspections.forEach(insp => {
          if (!insp.lat || !insp.lon) return;
          const coords = projection([insp.lon, insp.lat]);
          if (!coords) return;
          const [x, y] = coords;
          const s = 6;
          svg.append("polygon")
            .attr("points", `${x},${y-s} ${x-s*0.866},${y+s*0.5} ${x+s*0.866},${y+s*0.5}`)
            .attr("fill", "rgba(0,0,205,0.8)")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1);
          if (insp.hailSizeIn != null) {
            svg.append("text").attr("x", x).attr("y", y - s - 3)
              .attr("fill", "#76a8ff").attr("font-size", 6).attr("text-anchor", "middle")
              .attr("font-family", '"IBM Plex Mono", monospace').text(`${insp.hailSizeIn}"`);
          }
        });
        // Property pin — white
        if (propCoords) {
          const [px, py] = propCoords;
          svg.append("circle").attr("cx",px).attr("cy",py).attr("r",18)
            .attr("fill","rgba(255,255,255,0.08)").attr("stroke","rgba(255,255,255,0.2)").attr("stroke-width",1);
          svg.append("circle").attr("cx",px).attr("cy",py).attr("r",7)
            .attr("fill","#ffffff").attr("stroke","rgba(255,255,255,0.5)").attr("stroke-width",2)
            .attr("filter","url(#dol-white-glow)");
        }

        if (!cancelled) setMapStatus("ready");
      } catch(err) {
        console.error("DOL map error:", err);
        if (!cancelled) setMapStatus("error");
      }
    }

    renderMap();
    return () => { cancelled = true; };
  }, [propLat, propLon, dateOfLoss, classifiedHits.length]);

return (
    <div style={{ marginTop:16 }}>
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <div>
          <div style={{ color:"#4d6797", fontSize:9, letterSpacing:"0.15em", fontFamily:'"IBM Plex Mono", monospace', textTransform:"uppercase", marginBottom:2 }}>
            Recent Hail History · {dateRangeLabel}
          </div>
          <div style={{ color:"#7ea2df", fontSize:11, fontFamily:'"IBM Plex Mono", monospace' }}>
            {classifiedHits.length} NEXRAD detection{classifiedHits.length !== 1 ? "s" : ""} in view
          </div>
        </div>
        <div style={{ display:"flex", gap:14, alignItems:"center", fontFamily:'"IBM Plex Mono", monospace', fontSize:9 }}>
          <div style={{ display:"flex", alignItems:"center", gap:4, color:"#ffffff" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#ffffff" }} />Property
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, color:"#00dcff" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#00dcff" }} />Date of Loss
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, color:"#ffb04d" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#ffb04d" }} />Prior History
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, color:"#ff6450" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#ff6450" }} />Post-Loss
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, color:"#6e8dff" }}>
            <div style={{ width:0, height:0, borderLeft:"4px solid transparent", borderRight:"4px solid transparent", borderBottom:"8px solid #0000CD", filter:"drop-shadow(0 0 0.5px #ffffff)" }} />PE-Verified
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, color:"#ffb04d" }}>
            <div style={{ width:0, height:0, borderLeft:"4px solid transparent", borderRight:"4px solid transparent", borderBottom:"8px solid #ffb04d" }} />WSR-88D
          </div>
        </div>
      </div>
      {/* Map */}
      <div style={{ background:"#020609", border:"1px solid #17325f", borderRadius:8, overflow:"hidden", marginBottom:10 }}>
          {mapStatus === "loading" && (
            <div style={{ width:MAP_W, height:MAP_H, display:"flex", alignItems:"center", justifyContent:"center", color:"#4d6797", fontFamily:'"IBM Plex Mono", monospace', fontSize:11 }}>
              Loading map...
            </div>
          )}
          {mapStatus === "error" && (
            <div style={{ width:MAP_W, height:MAP_H, display:"flex", alignItems:"center", justifyContent:"center", color:"#4d6797", fontFamily:'"IBM Plex Mono", monospace', fontSize:11 }}>
              Map unavailable
            </div>
          )}
          <svg ref={svgRef} width={MAP_W} height={MAP_H} style={{ display: mapStatus==="ready" ? "block" : "none" }} />
        </div>

        {/* Hit list panel — below map (hidden when mapOnly) */}
        {!mapOnly && (
        <div style={{ background:"#020609", border:"1px solid #17325f", borderRadius:8, padding:"10px 12px", fontFamily:'"IBM Plex Mono", monospace', fontSize:9 }}>
          {(() => {
            // Attach distance to each hit
            const hitsWithDist = classifiedHits.map(h => {
              const dLat = ((parseFloat(h.lat) - propLat) * Math.PI) / 180;
              const dLon = ((parseFloat(h.lon) - propLon) * Math.PI) / 180;
              const a = Math.sin(dLat/2)**2 + Math.cos(propLat*Math.PI/180)*Math.cos(parseFloat(h.lat)*Math.PI/180)*Math.sin(dLon/2)**2;
              const dist = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              return { ...h, distMi: dist };
            });

            const bands = [
              { label: "< 5 mi", min:0, max:5, color:"#4caf50" },
              { label: "< 10 mi", min:5, max:10, color:"#8ef49c" },
              { label: "< 15 mi", min:10, max:15, color:"#ffb04d" },
              { label: "> 15 mi", min:15, max:999, color:"#4d6797" },
            ];

            const catColor = { dol:"#00dcff", before:"#ffb04d", after:"#ff6450" };
            const catLabel = { dol:"DOL", before:"Prior", after:"Post" };

            return bands.map(band => {
              const bandHits = hitsWithDist
                .filter(h => h.distMi >= band.min && h.distMi < band.max)
                .sort((a,b) => b.hDate - a.hDate);

              if (bandHits.length === 0) return null;

              return (
                <div key={band.label} style={{ marginBottom:10 }}>
                  <div style={{ color:band.color, fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", borderBottom:"1px solid #102240", paddingBottom:3, marginBottom:5 }}>
                    {band.label} · {bandHits.length} hit{bandHits.length !== 1 ? "s" : ""}
                  </div>
                  {bandHits.map((h, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3, paddingBottom:3, borderBottom:"1px solid #050b14" }}>
                      <div>
                        <span style={{ color: catColor[h.category], fontSize:7, marginRight:4 }}>[{catLabel[h.category]}]</span>
                        <span style={{ color:"#7ea2df" }}>{h.labelDate}</span>
                      </div>
                      <div style={{ display:"flex", gap:8, color:"#4d6797" }}>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:6, color:"#4d6797", marginBottom:1 }}>aloft</div>
                          <span style={{ color:"#eef3ff" }}>{h.maxSizeIn}"</span>
                        </div>
                        {(() => {
                          const surface = freezeLevelFt
                            ? meltingChartEstimate(parseFloat(h.maxSizeIn), freezeLevelFt)
                            : null;
                          return surface != null ? (
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:6, color:"#4d6797", marginBottom:1 }}>est. surface</div>
                              <span style={{ color:"#8db7ff" }}>{surface}"</span>
                            </div>
                          ) : null;
                        })()}
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:6, color:"#4d6797", marginBottom:1 }}>dist</div>
                          <span>{h.distMi.toFixed(1)} mi</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            });
          })()}
          {classifiedHits.length === 0 && (
            <div style={{ color:"#4d6797", fontSize:10, marginTop:20, textAlign:"center" }}>
              No NEXRAD detections in this period
            </div>
          )}
          {(() => {
            const parseInspDate = (str) => {
              if (!str) return null;
              const d = new Date(str);
              return isNaN(d) ? null : d;
            };
            const inspWithDist = inspections.map(insp => {
              const dLat = ((insp.lat - propLat) * Math.PI) / 180;
              const dLon = ((insp.lon - propLon) * Math.PI) / 180;
              const a = Math.sin(dLat/2)**2 + Math.cos(propLat*Math.PI/180)*Math.cos(insp.lat*Math.PI/180)*Math.sin(dLon/2)**2;
              const dist = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const inspDate = parseInspDate(insp.inspectionDate);
              const category = !inspDate ? "unknown"
                : inspDate <= dolDateObj ? "before" : "after";
              return { ...insp, distMi: dist, category, inspDate };
            }).filter(i => i.distMi <= 50);
            if (inspWithDist.length === 0) return null;
            const bands = [
              { label: "< 5 mi", min:0, max:5, color:"#4caf50" },
              { label: "< 10 mi", min:5, max:10, color:"#8ef49c" },
              { label: "< 15 mi", min:10, max:15, color:"#ffb04d" },
              { label: "> 15 mi", min:15, max:999, color:"#4d6797" },
            ];
            return (
            <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid #102240" }}>
              <div style={{ color:"#76a8ff", fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>
                PE-Verified Inspections · {inspWithDist.length} within 50 mi
              </div>
              {bands.map(band => {
                const bandInsp = inspWithDist
                  .filter(i => i.distMi >= band.min && i.distMi < band.max)
                  .sort((a,b) => (b.inspDate || 0) - (a.inspDate || 0));
                if (bandInsp.length === 0) return null;
                return (
                  <div key={`insp-${band.label}`} style={{ marginBottom:8 }}>
                    <div style={{ color:band.color, fontSize:8, letterSpacing:"0.12em", textTransform:"uppercase", borderBottom:"1px solid #102240", paddingBottom:3, marginBottom:4 }}>
                      {band.label} · {bandInsp.length} inspection{bandInsp.length !== 1 ? "s" : ""}
                    </div>
                    {bandInsp.map((insp, i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3, paddingBottom:3, borderBottom:"1px solid #050b14" }}>
                        <div>
                          <span style={{ color: insp.category === "before" ? "#76a8ff" : "#8db7ff", fontSize:7, marginRight:4 }}>
                            [{insp.category === "before" ? "Prior" : insp.category === "after" ? "Post" : "—"}]
                          </span>
                          <span style={{ color:"#7ea2df" }}>{insp.inspectionDate || "—"}</span>
                        </div>
                       <div style={{ display:"flex", gap:8, color:"#4d6797" }}>
                          {insp.dentsSizeIn != null && (
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:6, color:"#4d6797", marginBottom:1 }}>dents</div>
                              <span style={{ color:"#76a8ff" }}>{insp.dentsSizeIn}"</span>
                            </div>
                          )}
                          {insp.spatterSizeIn != null && (
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:6, color:"#4d6797", marginBottom:1 }}>spatter</div>
                              <span style={{ color:"#76a8ff" }}>{insp.spatterSizeIn}"</span>
                            </div>
                          )}
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:6, color:"#4d6797", marginBottom:1 }}>dist</div>
                            <span>{insp.distMi.toFixed(1)} mi</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
        )}
    </div>
  );
}
const PAGE_W = 794;
const PAGE_H = 1123;

const theme = {
  bg: "#03070f",
  pageBg: "#03070f",
  headerBg: "#07101d",
  panel: "#050b14",
  border: "#17325f",
  borderSoft: "#102240",
  text: "#eef3ff",
  muted: "#7ea2df",
  muted2: "#4d6797",
  blue: "#76a8ff",
  blueBright: "#8db7ff",
  button: "#5e86f0",
  buttonText: "#f8fbff",
  riskBg: "#572a00",
  riskBorder: "#b65c00",
  riskText: "#ffb04d",
  dangerText: "#ff8b47",
  purpleText: "#b395ff",
  white: "#ffffff",
};

const HAIL_COLUMNS = [
  { key: "date", label: "Date", width: "0.85fr" },
  { key: "size", label: "Size", width: "2.9fr" },
  { key: "location", label: "Location", width: "1.95fr" },
];

const OTHER_COLUMNS = [
  { key: "date", label: "Date", width: "0.9fr" },
  { key: "type", label: "Type", width: "1.85fr" },
  { key: "location", label: "Location", width: "2.0fr" },
  { key: "desc", label: "Description", width: "2.8fr" },
  { key: "damage", label: "Damage", width: "1.65fr" },
];

const systemPrompt = `You are a forensic weather analyst for Trinity Engineering, PLLC.
You will be given confirmed severe weather data from multiple sources for a specific property.
Your job is to analyze all provided data AND supplement it with web search to find any additional
confirmed storm events not captured in the structured data.

DATA TIERS — label each event with its source tier:
- Tier 1 (Empirical): LSR spotter-confirmed reports from NOAA/IEM — highest forensic value
- Tier 2 (Official): NOAA Storm Events Database county records — official but county-level
- Tier 3 (Supplemental): Web search findings from news, NWS reports, SPC archives — use to fill gaps only

CRITICAL RULES:
- The tier2_noaa_storm_events_hail array contains CONFIRMED hail events directly from the NOAA Storm Events Database. You MUST include ALL of these in the hailEvents array of your response. Do not omit any of them.
- Each item in tier2_noaa_storm_events_hail must become a hailEvent entry with proper date, size, location and source fields.
- Hail sizes must include coin references: 0.75"=penny, 0.88"=nickel, 1.00"=quarter, 1.25"=half-dollar, 1.50"=ping pong ball, 1.75"=golf ball, 2.00"=egg
- Use web search only to find events not already in the provided data.
- Never contradict or omit provided empirical data.
- Property damage values formatted as "$X,XXX" or "N/A"

Return ONLY valid JSON with this exact structure:
{
  "location": {
    "address": "...",
    "county": "...",
    "state": "...",
    "lat": "...",
    "lon": "..."
  },
  "summary": "2-3 sentence forensic summary of severe weather history based on all data tiers",
  "riskLevel": "Low" | "Moderate" | "High" | "Very High",
  "hailEvents": [
    {
      "date": "YYYY-MM-DD",
      "size": "X.XX inches (coin-size description)",
      "location": "city/area",
      "injuries": 0,
      "deaths": 0,
      "propertyDamage": "$X,XXX or N/A",
      "source": "NOAA/IEM LSR" | "NOAA Storm Events" | "NWS/SPC Report"
    }
  ],
  "otherEvents": [
    {
      "date": "YYYY-MM-DD",
      "type": "Tornado | Thunderstorm Wind | Flash Flood | etc",
      "description": "description of event",
      "damage": "$X,XXX or N/A"
    }
  ],
  "stats": {
    "totalHailEvents": 0,
    "largestHailSize": "X.XX inches",
    "avgEventsPerYear": "X.X",
    "mostActiveMonth": "Month",
    "yearsSearched": "YYYY-YYYY"
  },
  "sources": ["url1", "url2"],
  "stations": []
}

STATIONS ARRAY — only populate when a Date of Loss is provided:
Using the Visual Crossing station observations provided, populate up to 6 stations:
{
  "id": "station id",
  "name": "station name",
  "source": "Visual Crossing / ASOS",
  "lat": 00.0000,
  "lon": -00.0000,
  "hailSizeIn": 0.00,
  "hailProbability": 0,
  "windSpeedMph": 0,
  "windGustMph": 0
}
IMPORTANT: ASOS stations do not detect hail. Set hailSizeIn to 0 and hailProbability to 0 for all stations regardless of LSR data. Do NOT reference hail probability from ASOS stations in the summary. Hail probability is determined exclusively by NEXRAD POSH and is shown separately in the DOL analysis panel.
Return empty array [] when no Date of Loss is provided.`


const monoCellStyle = {
  fontFamily: '"IBM Plex Mono", monospace',
  color: theme.text,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const emptyRowStyle = {
  padding: "18px",
  color: theme.muted,
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 13,
};

const FIRST_PAGE_CONTENT_HEIGHT = PAGE_H - 92 - 18 - 18;
const CONT_PAGE_CONTENT_HEIGHT = PAGE_H - 20 - 18;
const SECTION_GAP = 18;
const EMPTY_TABLE_BODY_HEIGHT = 62;
const FOOTER_EXTRA_GAP = 100;

function ensureFonts() {
  if (!document.getElementById("swi-fonts")) {
    const link = document.createElement("link");
    link.id = "swi-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Montserrat:wght@600;700;800&display=swap";
    document.head.appendChild(link);
  }
}

async function parseResponseJson(response, label = "API") {
  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${label} returned invalid JSON: ${text.slice(0, 180)}`);
  }

  return data;
}

function extractJsonPayload(data) {
  const textBlocks = (data?.content || []).filter((b) => b.type === "text");
  const raw = textBlocks
    .map((b) => b.text)
    .join("\n")
    .replace(/```json|```/gi, "")
    .trim();

  if (!raw) return null;

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = raw.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return String(dateStr).trim();
}

function normalizeResult(result, address) {
  if (!result) return null;

  const years = result?.stats?.yearsSearched || `${CURRENT_YEAR - 10}-${CURRENT_YEAR}`;

  return {
    location: {
      address: result?.location?.address || address || "N/A",
      county: result?.location?.county || "Unknown County",
      state: result?.location?.state || "Unknown State",
      lat: result?.location?.lat || "",
      lon: result?.location?.lon || "",
    },
    summary: result?.summary || "No summary was returned. Please rerun the query.",
    riskLevel: result?.riskLevel || "Moderate",
    hailEvents: Array.isArray(result?.hailEvents) ? result.hailEvents : [],
    otherEvents: Array.isArray(result?.otherEvents) ? result.otherEvents : [],
    stats: {
      totalHailEvents: result?.stats?.totalHailEvents ?? 0,
      largestHailSize: result?.stats?.largestHailSize || "N/A",
      avgEventsPerYear: result?.stats?.avgEventsPerYear || "0.0",
      mostActiveMonth: result?.stats?.mostActiveMonth || "N/A",
      yearsSearched: years,
      nexradHits: result?.stats?.nexradHits ?? "—",
    },
    sources: Array.isArray(result?.sources) ? result.sources : [],
    mcds: Array.isArray(result?.mcds) ? result.mcds : [],
  };
}

function getRiskStyle(risk) {
  switch (risk) {
    case "Low":
      return { bg: "#102713", border: "#2f7a36", text: "#8ef49c" };
    case "Moderate":
      return { bg: "#433000", border: "#b98700", text: "#ffd25a" };
    case "High":
      return { bg: theme.riskBg, border: theme.riskBorder, text: theme.riskText };
    case "Very High":
      return { bg: "#4a0f0f", border: "#af3030", text: "#ff8177" };
    default:
      return { bg: theme.riskBg, border: theme.riskBorder, text: theme.riskText };
  }
}

function getHeight(node) {
  return node?.offsetHeight || 0;
}

function buildMeasuredPages(data, metrics) {
  if (!data || !metrics) return [];

  const pages = [];

      function createPage({ showTopHeader = false, showIntro = false } = {}) {
    const capacity = showTopHeader ? FIRST_PAGE_CONTENT_HEIGHT : CONT_PAGE_CONTENT_HEIGHT;
    const introHeight = showIntro ? metrics.introHeight : 0;
    const footerReserve = metrics.footerHeight + FOOTER_EXTRA_GAP;

    return {
      showTopHeader,
      showIntro,
      sections: [],
      showFooter: false,
      remaining: capacity - introHeight - footerReserve,
    };
  }


  function pushNewPage(opts = {}) {
    const page = createPage(opts);
    pages.push(page);
    return page;
  }

  // Cover page: intro only, no event tables attached
  pushNewPage({ showTopHeader: true, showIntro: true });

  // Start a new page for events tables
  let currentPage = pushNewPage({ showTopHeader: false, showIntro: false });

  function ensureRoom(requiredHeight) {
    if (currentPage.remaining >= requiredHeight) return;
    currentPage = pushNewPage({ showTopHeader: false, showIntro: false });
  }

  function addMeasuredTableSections(type, rows, baseHeight, rowHeights, firstTitle, continuedTitle) {
    if (!rows.length) {
      const required = baseHeight + EMPTY_TABLE_BODY_HEIGHT + SECTION_GAP;
      ensureRoom(required);

      currentPage.sections.push({
        type,
        title: firstTitle,
        rows: [],
      });

      currentPage.remaining -= required;
      return;
    }

    let rowIndex = 0;
    let firstSection = true;

    while (rowIndex < rows.length) {
      const title = firstSection ? firstTitle : continuedTitle;
      const firstRowHeight = rowHeights[rowIndex] || 60;

      ensureRoom(baseHeight + firstRowHeight + SECTION_GAP);

      let used = baseHeight;
      const chunk = [];

      while (rowIndex < rows.length) {
        const rowHeight = rowHeights[rowIndex] || 60;

        if (chunk.length > 0 && used + rowHeight > currentPage.remaining) {
          break;
        }

        chunk.push(rows[rowIndex]);
        used += rowHeight;
        rowIndex += 1;
      }

      if (!chunk.length) {
        chunk.push(rows[rowIndex]);
        used += rowHeights[rowIndex] || 60;
        rowIndex += 1;
      }

      currentPage.sections.push({
        type,
        title,
        rows: chunk,
      });

      currentPage.remaining -= used + SECTION_GAP;
      firstSection = false;
    }
  }

  addMeasuredTableSections(
    "hail",
    data.hailEvents,
    metrics.hailBaseHeight,
    metrics.hailRowHeights,
    "Hail Events - Past 10 Years",
    "Hail Events - Continued"
  );

  addMeasuredTableSections(
    "other",
    data.otherEvents,
    metrics.otherBaseHeight,
    metrics.otherRowHeights,
    "Other Severe Weather Events",
    "Other Severe Weather Events - Continued"
  );

  const sourcesBodyHeight =
    data.sources.length > 0
      ? metrics.sourceRowHeights.reduce((sum, h) => sum + h, 0)
      : EMPTY_TABLE_BODY_HEIGHT;

  const sourcesHeight = metrics.sourcesBaseHeight + sourcesBodyHeight + SECTION_GAP;
  const footerReserve = metrics.footerHeight + FOOTER_EXTRA_GAP;

  if (currentPage.remaining < sourcesHeight + footerReserve) {
    currentPage = pushNewPage({ showTopHeader: false, showIntro: false });
  }

  currentPage.sections.push({
    type: "sources",
    title: "Data Sources",
    sources: data.sources,
  });
  currentPage.remaining -= sourcesHeight;
  currentPage.showFooter = true;

  return pages;
}

function LogoMark({ large = false }) {
  return (
    <img
      src="/swi-logo.png"
      alt="Severe Weather Intelligence"
      style={{
        height: large ? 72 : 48,
        width: "auto",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}

function FooterContent() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <LogoMark large />
      </div>
      <div
        style={{
          color: theme.white,
          fontSize: 14,
        }}
      >
        ©2026 Trinity Engineering, PLLC All Rights Reserved
      </div>
    </>
  );
}

function TrinityFooter() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 34,
        textAlign: "center",
      }}
    >
      <FooterContent />
    </div>
  );
}

function FooterMeasure() {
  return (
    <div style={{ textAlign: "center" }}>
      <FooterContent />
    </div>
  );
}

function AppHeader({ onLogout }) {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div
      style={{
        background: theme.headerBg,
        borderBottom: `1px solid ${theme.borderSoft}`,
        padding: "10px 24px 10px",
        position: "relative",
      }}
    >
      <style>{`
        .hail-header-inner {
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .hail-header-meta {
          color: ${theme.muted2};
          font-size: 10px;
          letter-spacing: 1.5px;
          align-self: flex-start;
          font-family: "IBM Plex Mono", monospace;
          line-height: 1.9;
          min-width: 140px;
          flex-shrink: 0;
        }
        .hail-header-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .hail-header-swi {
          height: 54px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .hail-header-byrow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 0;
        }
        .hail-header-by {
          font-family: "Montserrat", "Inter", sans-serif;
          font-weight: 700;
          font-size: 10px;
          letter-spacing: 0.28em;
          color: ${theme.muted2};
          text-transform: uppercase;
        }
        .hail-header-trinity {
          height: 70px;
          width: auto;
          object-fit: contain;
        }
        .hail-header-tagline {
          color: ${theme.muted2};
          font-size: 8.5px;
          letter-spacing: 0.20em;
          font-family: "IBM Plex Mono", monospace;
          text-transform: uppercase;
          margin-top: 1px;
        }
        .hail-header-actions {
          min-width: 130px;
          display: flex;
          justify-content: flex-end;
          align-self: flex-start;
          align-items: center;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .hail-header-inner { flex-direction: column; gap: 8px; }
          .hail-header-meta { display: none; }
          .hail-header-actions {
            position: absolute;
            top: 10px;
            right: 16px;
            min-width: unset;
            align-self: unset;
          }
          .hail-header-swi { height: 44px; }
          .hail-header-trinity { height: 40px; }
          .hail-header-tagline { font-size: 8.5px; letter-spacing: 0.14em; }
        }
        @media (max-width: 768px) {
          .hail-header-signout-label { display: none; }
          .hail-header-signout { padding: 8px 10px !important; }
        }
        @media (max-width: 480px) {
          .hail-header-swi { height: 36px; }
          .hail-header-trinity { height: 30px; }
          .hail-header-by { font-size: 8px; }
        }
      `}</style>

      <div className="hail-header-inner">
        {/* Left — data source badge */}
        <div className="hail-header-meta">
        <div>DATA SOURCE: NOAA NWS</div>
        <div>NCEI STORM EVENTS DB</div>
        <div>NEXRAD LEVEL-III HDA</div>
        </div>

        {/* Center — stacked logo block */}
        <div className="hail-header-center">
          <img src="/swi-logo.png" alt="Severe Weather Intelligence" className="hail-header-swi" />
          <div className="hail-header-byrow">
            <span className="hail-header-by">BY</span>
            <img src="/trinity-logo.png" alt="Trinity Engineering" className="hail-header-trinity" />
          </div>
        <div className="hail-header-tagline">NOAA Storm Events Database · NEXRAD Level-III HDA · 10-Year Lookback</div>
        </div>

        {/* Right — sign out */}
        <div className="hail-header-actions">
          <motion.button
            onClick={() => setShowConfirm(true)}
            whileHover={{
              scale: 1.04,
              backgroundColor: "rgba(94,134,240,0.12)",
              borderColor: theme.blue,
              boxShadow: "0 0 18px rgba(94,134,240,0.25)",
            }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="hail-header-signout"
            style={{
              background: "rgba(94,134,240,0.06)",
              color: theme.blue,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="hail-header-signout-label">Sign Out</span>
          </motion.button>
        </div>
      </div>

      {/* Logout confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setShowConfirm(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: "28px 28px 24px",
                maxWidth: 340,
                width: "100%",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                textAlign: "center",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(94,134,240,0.1)",
                border: `1px solid ${theme.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <div style={{ color: theme.text, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Sign Out</div>
              <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                Are you sure you want to sign out?
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <motion.button
                  onClick={() => setShowConfirm(false)}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10,
                    background: "transparent",
                    border: `1px solid ${theme.borderSoft}`,
                    color: theme.muted, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >Cancel</motion.button>
                <motion.button
                  onClick={() => { setShowConfirm(false); onLogout(); }}
                  whileHover={{ backgroundColor: "rgba(94,134,240,0.2)", boxShadow: "0 0 18px rgba(94,134,240,0.25)" }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10,
                    background: "rgba(94,134,240,0.1)",
                    border: `1px solid ${theme.blue}`,
                    color: theme.blue, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >Sign Out</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function SectionLabel({ children }) {
  return (
    <div
      style={{
        color: theme.muted2,
        fontSize: 10,
        letterSpacing: 3.2,
        textTransform: "uppercase",
        fontFamily: '"IBM Plex Mono", monospace',
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function Panel({ children, style = {} }) {
  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Rotating gradient border RUN QUERY button ─────────────────────────────────
function GradientRunButton({ onClick, loading, className = "" }) {
  return (
    <>
      <style>{`
        @property --rg-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes rg-spin {
          to { --rg-angle: 360deg; }
        }
        .rq-outer {
          position: relative;
          border-radius: 12px;
          background: conic-gradient(from var(--rg-angle), #5e86f0, #8db7ff, #b0c8ff, #1a2a60, #03070f 55%, #5e86f0);
          animation: rg-spin 2.8s linear infinite;
          padding: 2px;
          cursor: pointer;
          display: flex;
          align-items: stretch;
          height: 52px;
          min-height: 52px;
          transition: transform 0.12s, opacity 0.12s;
          user-select: none;
        }
        .rq-outer:active:not(.rq-loading) {
          transform: scale(0.97);
        }
        .rq-outer.rq-loading {
          animation: none;
          background: #2a3d80;
          opacity: 0.65;
          cursor: default;
        }
        .rq-inner {
          flex: 1;
          border-radius: 10px;
          background: #03070f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.14em;
          color: #f8fbff;
          font-family: "Inter", Arial, sans-serif;
          transition: background 0.15s;
          gap: 8px;
        }
        .rq-outer:hover:not(.rq-loading) .rq-inner {
          background: #060e1c;
        }
      `}</style>
      <div
        className={`rq-outer hail-search-btn${loading ? " rq-loading" : ""} ${className}`}
        onClick={loading ? undefined : onClick}
        role="button"
        tabIndex={loading ? -1 : 0}
        onKeyDown={(e) => { if (!loading && (e.key === "Enter" || e.key === " ")) onClick?.(); }}
      >
        <div className="rq-inner">
          {loading ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "rg-spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              RUNNING…
            </>
          ) : "RUN QUERY"}
        </div>
      </div>
    </>
  );
}

// ── Slide-to-download PDF button ───────────────────────────────────────────────
function SlideDownloadButton({ onDownload, loading, label = "SLIDE TO DOWNLOAD ›" }) {
  // phase: "idle" | "loading" | "done"
  const [phase, setPhase] = useState("idle");
  const [isDragging, setIsDragging] = useState(false);
  // bump this to force-remount the drag handle so its internal x resets cleanly
  const [handleKey, setHandleKey] = useState(0);

  const DRAG_MAX = 162;
  const THRESHOLD = DRAG_MAX * 0.82;

  // Single motion value — drive it manually; no spring wrapper (avoids x conflict)
  const x = useMotionValue(0);
  const fillWidth = useTransform(x, (v) => Math.max(0, v + 50));

  // Detect loading: true → false (PDF finished)
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;
    if (phase === "loading" && wasLoading && !loading) {
      setPhase("done");
      const t = setTimeout(() => {
        setPhase("idle");
        setHandleKey((k) => k + 1); // remount handle at x=0
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [loading, phase]);

  const handleDragEnd = (_, info) => {
    setIsDragging(false);
    if (info.offset.x >= THRESHOLD) {
      // Lock at end, show loading overlay, fire download
      x.set(DRAG_MAX);
      setPhase("loading");
      onDownload();
    } else {
      // Spring back to start
      animate(x, 0, { type: "spring", stiffness: 380, damping: 36 });
    }
  };

  const showTrack = phase === "idle";

  return (
    <div style={{ position: "relative", height: 52, minWidth: 230, userSelect: "none" }}>
      {/* Track shell */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 12,
        background: "#01050b", border: `1px solid ${theme.border}`,
        overflow: "hidden",
      }}>
        {/* Blue fill that follows handle */}
        {showTrack && (
          <motion.div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: fillWidth,
            background: "linear-gradient(90deg, rgba(94,134,240,0.28), rgba(94,134,240,0.06))",
            borderRadius: "12px 0 0 12px",
            pointerEvents: "none",
          }} />
        )}

        {/* Idle label */}
        {showTrack && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            paddingLeft: 54,
            color: theme.muted2, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.14em", fontFamily: "Inter, Arial, sans-serif",
            pointerEvents: "none",
          }}>
            {label}
          </div>
        )}

        {/* Loading / done overlay */}
        <AnimatePresence>
          {!showTrack && (
            <motion.div
              key={phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{
                position: "absolute", inset: 0, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, color: "#fff", fontWeight: 700, fontSize: 13,
                letterSpacing: "0.08em", fontFamily: "Inter, Arial, sans-serif",
                background: phase === "done" ? theme.button : "#0e1d4a",
              }}
            >
              {phase === "done" ? (
                <motion.span
                  initial={{ scale: 0.65 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  style={{ display: "flex", alignItems: "center", gap: 7 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  PDF SAVED
                </motion.span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "rg-spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  GENERATING…
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drag handle — keyed so it fully remounts (x = 0) after reset */}
      <AnimatePresence>
        {showTrack && (
          <motion.div
            key={handleKey}
            drag="x"
            dragConstraints={{ left: 0, right: DRAG_MAX }}
            dragElastic={0.04}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ x, position: "absolute", top: 4, left: 4, zIndex: 10, touchAction: "none" }}
          >
            <motion.div
              animate={{
                scale: isDragging ? 1.08 : 1,
                boxShadow: isDragging
                  ? "0 0 30px rgba(94,134,240,0.75)"
                  : "0 0 16px rgba(94,134,240,0.38)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              style={{
                width: 44, height: 44, borderRadius: 9,
                background: `linear-gradient(135deg, ${theme.blueBright}, ${theme.button})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isDragging ? "grabbing" : "grab",
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchPanel({ address, setAddress, dateOfLoss, setDateOfLoss, onLookup, loading }) {
  const fieldStyle = {
    background: "#01050b",
    color: theme.blueBright,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "14px 18px",
    fontSize: 15,
    outline: "none",
    fontFamily: '"IBM Plex Mono", monospace',
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <Panel style={{ marginBottom: SECTION_GAP }}>
      <SectionLabel>Property Address Lookup</SectionLabel>

      <style>{`
        .hail-search-grid {
          display: grid;
          grid-template-columns: 1fr 200px 170px;
          gap: 14px;
          align-items: end;
        }
        @media (max-width: 768px) {
          .hail-search-grid {
            grid-template-columns: 1fr 1fr;
          }
          .hail-search-btn { grid-column: 1 / -1; }
        }
        @media (max-width: 480px) {
          .hail-search-grid {
            grid-template-columns: 1fr;
          }
          .hail-search-btn { grid-column: unset; }
        }
      `}</style>
      <div className="hail-search-grid">
        <div>
          <div
            style={{
              color: theme.muted2,
              fontSize: 9,
              letterSpacing: "0.15em",
              fontFamily: '"IBM Plex Mono", monospace',
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            Property Address
          </div>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLookup()}
            placeholder="53 Angus Run, Seneca, SC"
            style={fieldStyle}
          />
        </div>

        {/* Date of Loss — custom calendar picker */}
        <div>
          <div
            style={{
              color: theme.muted2,
              fontSize: 9,
              letterSpacing: "0.15em",
              fontFamily: '"IBM Plex Mono", monospace',
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            Date of Loss (optional)
          </div>
          <DatePicker
            value={dateOfLoss}
            onChange={setDateOfLoss}
            placeholder="Select date…"
          />
        </div>

        {/* RUN QUERY button */}
        <GradientRunButton onClick={onLookup} loading={loading} />
      </div>

      {dateOfLoss && (
        <div
          style={{
            marginTop: 8,
            color: theme.blue,
            fontSize: 11,
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: "0.05em",
          }}
        >
          ◆ Date of Loss set — IDW storm interpolation will run after query
        </div>
      )}
    </Panel>
  );
}

function PdfPageShell({ children, showTopHeader = false, preview = false }) {
  return (
    <div
      style={{
        width: PAGE_W,
        // PDF capture needs exact page height; preview uses auto so no blank space
        height: preview ? "auto" : PAGE_H,
        minHeight: preview ? undefined : PAGE_H,
        background: theme.pageBg,
        color: theme.text,
        position: "relative",
        overflow: preview ? "visible" : "hidden",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      {showTopHeader ? (
        <div
          style={{
            background: theme.headerBg,
            borderBottom: `1px solid ${theme.borderSoft}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "10px 16px 10px 14px",
          }}
        >
          {/* Left — data source badge */}
          <div
            style={{
              color: theme.muted2,
              fontSize: 8,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: '"IBM Plex Mono", monospace',
              lineHeight: 1.55,
              paddingTop: 2,
            }}
          >
            <div>DATA SOURCE: NOAA NWS</div>
            <div>NCEI STORM EVENTS DB</div>
          </div>

          {/* Center — stacked logo block matching app header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <img
              src="/swi-logo.png"
              alt="Severe Weather Intelligence"
              style={{ height: 52, width: "auto", objectFit: "contain" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontFamily: "Montserrat, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: 9,
                  letterSpacing: "0.28em",
                  color: theme.muted2,
                  textTransform: "uppercase",
                }}
              >
                BY
              </span>
              <img
                src="/trinity-logo.png"
                alt="Trinity Engineering"
                style={{ height: 48, width: "auto", objectFit: "contain" }}
              />
            </div>
            <div
              style={{
                color: theme.muted2,
                fontSize: 7.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              NOAA STORM EVENTS DATABASE · 10-YEAR LOOKBACK
            </div>
          </div>

          {/* Right — spacer to balance layout */}
          <div style={{ width: 110 }} />
        </div>
      ) : null}

      <div
        style={{
          padding: showTopHeader ? "18px 22px 18px 22px" : "20px 22px 18px 22px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AddressLookupBand({ address }) {
  return (
    <Panel style={{ marginBottom: SECTION_GAP, paddingBottom: 16 }}>
      <SectionLabel>Property Address Lookup</SectionLabel>
      <div
        style={{
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          background: "#01050b",
          color: theme.blueBright,
          padding: "0 16px",
          fontSize: 14,
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      >
        {address || "N/A"}
      </div>
    </Panel>
  );
}

function SummaryCards({ data }) {
  const risk = getRiskStyle(data.riskLevel);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: SECTION_GAP,
        marginBottom: SECTION_GAP,
      }}
    >
      <Panel>
        <SectionLabel>Location Identified</SectionLabel>
        <div
          style={{
            color: theme.blueBright,
            fontWeight: 800,
            fontSize: 17,
            lineHeight: 1.25,
            marginBottom: 8,
          }}
        >
          {data.location.county}, {data.location.state}
        </div>
        <div
          style={{
            color: theme.muted,
            fontSize: 13,
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          {data.location.address}
        </div>
      </Panel>

      <div
        style={{
          background: risk.bg,
          border: `1px solid ${risk.border}`,
          borderRadius: 12,
          padding: 18,
        }}
      >
        <SectionLabel>Hail Risk Assessment</SectionLabel>
        <div
          style={{
            color: risk.text,
            fontWeight: 800,
            fontSize: 22,
            marginBottom: 8,
          }}
        >
          {data.riskLevel}
        </div>
        <div
          style={{
            color: "#d5b07a",
            fontSize: 13,
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          {data.stats.yearsSearched} · {data.stats.totalHailEvents} events found
        </div>
      </div>
    </div>
  );
}

function WeatherSummary({ text }) {
  return (
    <Panel style={{ marginBottom: SECTION_GAP }}>
      <SectionLabel>Weather Summary</SectionLabel>
      <div
        style={{
          color: theme.text,
          fontSize: 14,
          lineHeight: 1.9,
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
    </Panel>
  );
}

function StatsGrid({ stats }) {
const items = [
    { label: "Total Hail Events", value: stats.totalHailEvents },
    { label: "Largest Hail", value: stats.largestHailSize },
    { label: "Avg / Year", value: stats.avgEventsPerYear },
    { label: "Most Active Month", value: stats.mostActiveMonth },
    { label: "NEXRAD Hits", value: stats.nexradHits ?? "—" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
        marginBottom: SECTION_GAP,
      }}
    >
      {items.map((item) => (
        <Panel key={item.label} style={{ padding: "10px 10px 12px 10px" }}>
          <div
            style={{
              color: theme.muted2,
              fontSize: 10,
              letterSpacing: 2.6,
              textTransform: "uppercase",
              fontFamily: '"IBM Plex Mono", monospace',
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              color: theme.blueBright,
              textAlign: "center",
              fontSize: 16,
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            {item.value}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function ReportIntro({ data, address }) {
  return (
    <>
      <AddressLookupBand address={address} />
      <SummaryCards data={data} />
      <WeatherSummary text={data.summary} />
      <StatsGrid stats={data.stats} />
    </>
  );
}

function TableShell({ title, children, style = {} }) {
  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: SECTION_GAP,
        ...style,
      }}
    >
      <div
        style={{
          padding: "16px 18px 13px 18px",
          borderBottom: `1px solid ${theme.borderSoft}`,
          color: theme.muted2,
          fontSize: 10,
          letterSpacing: 3.2,
          textTransform: "uppercase",
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function TableHeader({ columns }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns.map((c) => c.width).join(" "),
        padding: "10px 18px",
        borderBottom: `1px solid ${theme.borderSoft}`,
        color: theme.muted,
        fontSize: 10,
        letterSpacing: 1.8,
        textTransform: "uppercase",
        fontFamily: '"IBM Plex Mono", monospace',
      }}
    >
      {columns.map((c) => (
        <div key={c.key}>{c.label}</div>
      ))}
    </div>
  );
}

function HailEventsTable({ rows, title = "Hail Events - Past 10 Years", style = {}, propLat = 0, propLon = 0 }) {
  return (
    <TableShell title={title} style={style}>
      <TableHeader columns={HAIL_COLUMNS} />

      {rows.length === 0 ? (
        <div style={emptyRowStyle}>No hail events returned.</div>
      ) : (
        rows.map((row, idx) => (
          <div
            key={`${row.date}-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: HAIL_COLUMNS.map((c) => c.width).join(" "),
              padding: "13px 18px",
              borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${theme.borderSoft}`,
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            <div style={monoCellStyle}>{formatDate(row.date)}</div>
            <div style={{ ...monoCellStyle, color: "#ffcb54", fontWeight: 700 }}>
              {row.size || "N/A"}
              {row.nexradCorroboration && (
                <span style={{
                  display: "inline-block",
                  marginLeft: 8,
                  padding: "2px 7px",
                  fontSize: 8,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  borderRadius: 3,
                  fontFamily: '"IBM Plex Mono", monospace',
                  verticalAlign: "middle",
                  background: row.nexradOnly ? "rgba(255,176,77,0.15)" : "rgba(76,175,80,0.15)",
                  color: row.nexradOnly ? "#ffb04d" : "#4caf50",
                  border: `1px solid ${row.nexradOnly ? "rgba(255,176,77,0.4)" : "rgba(76,175,80,0.4)"}`,
                }}>
                  {row.nexradOnly ? "RADAR ONLY" : "CORROBORATED"}
                </span>
              )}
              {row.nexradCorroboration && (
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, color: row.nexradCorroboration.corroborated ? "#4caf50" : "#aaa" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{width:10,height:10,marginRight:3,verticalAlign:'middle',display:'inline-block'}}>
                    <path d="M1 11 A9 9 0 0 1 19 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M3.5 11 A6.5 6.5 0 0 1 16.5 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 11 A4 4 0 0 1 14 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="10" cy="11" r="1.5"/>
                    <rect x="9" y="11" width="2" height="4" rx="0.5"/>
                    <rect x="4" y="15" width="12" height="2" rx="1"/>
                  </svg>
                  {` NEXRAD (WSR-88D) ${row.nexradCorroboration.maxSizeIn}" aloft (per FMH-11 Part C §2.18)`}
                  {row.nexradCorroboration.corroborated ? " ✓ Corroborated" : " (independent radar detection)"}
                  {row.nexradCorroboration.radar ? ` · ${row.nexradCorroboration.radar}` : ""}
                  {(row.nexradCorroboration.probHail != null || row.nexradCorroboration.probSevere != null) && (
                    <div style={{ marginTop: 2, color: "#7ea2df", fontSize: 9 }}>
                      {row.nexradCorroboration.probHail != null && `POH: ${row.nexradCorroboration.probHail}%`}
                      {row.nexradCorroboration.probHail != null && row.nexradCorroboration.probSevere != null && " · "}
                      {row.nexradCorroboration.probSevere != null && `POSH: ${row.nexradCorroboration.probSevere}% (prob. severe hail ≥ 0.75" at surface · per FMH-11 Part C §2.18, accounts for reflectivity & freezing level height)`}
                    </div>
                  )}
                  {(() => {
                    const geo = row.nexradCorroboration.radar ? getBeamGeometry(
                      propLat,
                      propLon,
                      row.nexradCorroboration.radar
                    ) : null;
                    if (!geo) return null;
                    return (
                      <div style={{ marginTop: 2, color: geo.color }}>
                        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: geo.color, marginRight: 4, verticalAlign: 'middle' }} />
                       {`${geo.radarId} · ${geo.distMi} mi · beam bottom ${geo.beamBottom} ft · beam center ${geo.beamCenter} ft · beam width ${geo.beamWidth} ft (${geo.reliability}) · per FMH-11 Part B beam geometry`}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div style={monoCellStyle}>{row.location || "N/A"}</div>
          </div>
        ))
      )}
      <div style={{ padding:"8px 18px 10px", borderTop:`1px solid #102240`, color:"#4d6797", fontSize:10, fontFamily:'"IBM Plex Mono", monospace', fontStyle:"italic" }}>
        * All hail sizes represent maximum detection aloft by WSR-88D radar per FMH-11 Part C §2.18. Ground-level size may differ due to melting during descent.
      </div>
    </TableShell>
  );
}

function OtherEventsTable({ rows, title = "Other Severe Weather Events", style = {} }) {
  return (
    <TableShell title={title} style={style}>
      <TableHeader columns={OTHER_COLUMNS} />

      {rows.length === 0 ? (
        <div style={emptyRowStyle}>No additional severe weather events returned.</div>
      ) : (
        rows.map((row, idx) => (
          <div
            key={`${row.date}-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: OTHER_COLUMNS.map((c) => c.width).join(" "),
              padding: "13px 18px",
              borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${theme.borderSoft}`,
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            <div style={monoCellStyle}>{formatDate(row.date)}</div>
            <div style={{ ...monoCellStyle, color: theme.purpleText, fontWeight: 700 }}>
              {row.type || "N/A"}
            </div>
            <div style={monoCellStyle}>{row.location || "N/A"}</div>
            <div style={monoCellStyle}>{row.description || "N/A"}</div>
            <div style={{ ...monoCellStyle, color: theme.dangerText }}>
              {row.damage || "N/A"}
            </div>
          </div>
        ))
      )}
    </TableShell>
  );
}

function SourcesBlock({ sources, style = {} }) {
  return (
    <TableShell title="Data Sources" style={style}>
      <div style={{ padding: "14px 18px 12px 18px" }}>
        {sources.length === 0 ? (
          <div style={emptyRowStyle}>No source links returned.</div>
        ) : (
          sources.map((s, i) => (
            <div
              key={`${s}-${i}`}
              style={{
                color: theme.blue,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
                lineHeight: 1.7,
                marginBottom: 6,
                wordBreak: "break-all",
              }}
            >
              ↗ {s}
            </div>
          ))
        )}
      </div>
    </TableShell>
  );
}

function ReportPage({ page, data, address, preview = false }) {
  return (
    <PdfPageShell showTopHeader={page.showTopHeader} preview={preview}>
      {page.showIntro ? <ReportIntro data={data} address={address} /> : null}

      {page.sections.map((section, idx) => {
        if (section.type === "hail") {
          return (
            <HailEventsTable
              key={`${section.type}-${idx}`}
              rows={section.rows}
              title={section.title}
              propLat={parseFloat(data?.location?.lat || 0)}
              propLon={parseFloat(data?.location?.lon || 0)}
            />
          );
        }

        if (section.type === "other") {
          return (
            <OtherEventsTable
              key={`${section.type}-${idx}`}
              rows={section.rows}
              title={section.title}
            />
          );
        }

        if (section.type === "sources") {
          return (
            <SourcesBlock
              key={`${section.type}-${idx}`}
              sources={section.sources}
            />
          );
        }

        return null;
      })}

      {/* Footer: only in PDF-capture mode, not in on-screen preview */}
      {page.showFooter && !preview ? <TrinityFooter /> : null}
      {/* In preview, render footer inline so it flows naturally after content */}
      {page.showFooter && preview ? (
        <div style={{ textAlign: "center", padding: "24px 0 18px" }}>
          <FooterContent />
        </div>
      ) : null}
    </PdfPageShell>
  );
}

function ReportPreview({ data, address, pages }) {
  return (
    <div>
      <div
        style={{
          color: theme.muted2,
          fontSize: 11,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          fontFamily: '"IBM Plex Mono", monospace',
          marginBottom: 12,
        }}
      >
        Report preview
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {pages.map((page, idx) => (
          <div
            key={`preview-${idx}`}
            style={{
              width: "100%",
              overflowX: "auto",
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "#01040a",
              padding: 10,
            }}
          >
            <div style={{ width: PAGE_W }}>
              {/* preview=true → auto height, no blank space, inline footer */}
              <ReportPage page={page} data={data} address={address} preview />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfLightLoading, setPdfLightLoading] = useState(false);

  const [dateOfLoss, setDateOfLoss] = useState("");
  const [idwResult, setIdwResult] = useState(null);
  const [dolNexradHit, setDolNexradHit] = useState(null);
  const [propCoords, setPropCoords] = useState({ lat: null, lon: null });
  const [freezeLevelFt, setFreezeLevelFt] = useState(null);
  const [corroboration, setCorroboration] = useState(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Auth screen routing: 'login' | 'signup' | 'forgot' | 'otp' | 'new-password'
  const [authScreen, setAuthScreen] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode]   = useState("");

  const [pages, setPages] = useState([]);
  const [layoutReady, setLayoutReady] = useState(false);
  const [nexradHits, setNexradHits] = useState([]);
  const [hailMapInspections, setHailMapInspections] = useState([]);
  const mapPageRef = useRef(null);
  const dolMapPdfRef = useRef(null);

  const pageRefs = useRef([]);

  const introMeasureRef = useRef(null);
  const hailBaseMeasureRef = useRef(null);
  const otherBaseMeasureRef = useRef(null);
  const sourcesBaseMeasureRef = useRef(null);
  const footerMeasureRef = useRef(null);

  const hailRowMeasureRefs = useRef([]);
  const otherRowMeasureRefs = useRef([]);
  const sourceRowMeasureRefs = useRef([]);

  useEffect(() => {
    ensureFonts();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedToken = localStorage.getItem("hail_token");
        const res = await fetch(`${API}/api/auth/session`, {
          credentials: "include",
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        });
        const data = await parseResponseJson(res, "Session API");
        if (data?.authenticated) {
          setAuthenticated(true);
          setCurrentUser(data.user || null);
        } else {
          setAuthenticated(false);
        }
      } catch {
        setAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkSession();
  }, []);

  const normalized = useMemo(() => normalizeResult(result, address), [result, address]);

  useEffect(() => {
    let cancelled = false;

    async function measureLayout() {
      if (!normalized) {
        if (!cancelled) {
          setPages([]);
          setLayoutReady(true);
        }
        return;
      }

      if (!cancelled) setLayoutReady(false);

      await document.fonts.ready;

      requestAnimationFrame(() => {
        if (cancelled) return;

        const metrics = {
          introHeight: getHeight(introMeasureRef.current),
          hailBaseHeight: getHeight(hailBaseMeasureRef.current),
          otherBaseHeight: getHeight(otherBaseMeasureRef.current),
          sourcesBaseHeight: getHeight(sourcesBaseMeasureRef.current),
          footerHeight: getHeight(footerMeasureRef.current),
          hailRowHeights: normalized.hailEvents.map((_, i) =>
            getHeight(hailRowMeasureRefs.current[i])
          ),
          otherRowHeights: normalized.otherEvents.map((_, i) =>
            getHeight(otherRowMeasureRefs.current[i])
          ),
          sourceRowHeights: normalized.sources.map((_, i) =>
            getHeight(sourceRowMeasureRefs.current[i])
          ),
        };

        const builtPages = buildMeasuredPages(normalized, metrics);
        setPages(builtPages);
        setLayoutReady(true);
      });
    }

    measureLayout();

    return () => {
      cancelled = true;
    };
  }, [normalized]);

  function handleAuthSuccess(user) {
    setCurrentUser(user || null);
    setAuthenticated(true);
  }

  async function handleLogout() {
    try {
      const storedToken = localStorage.getItem("hail_token");
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
      });
    } catch {
      // ignore
    }
    localStorage.removeItem("hail_token");
    setAuthenticated(false);
    setCurrentUser(null);
    setResult(null);
    setAddress("");
    setAuthScreen("login");
  }

  async function callAnthropic(messages, useTools = true) {
    const storedToken = localStorage.getItem("hail_token");
    const res = await fetch(`${API}/api/anthropic`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: useTools ? 4096 : 4096,
        system: systemPrompt,
        ...(useTools
          ? { tools: [{ type: "web_search_20250305", name: "web_search" }] }
          : {}),
        messages,
      }),
    });

    const text = await res.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Unexpected server response: ${text.slice(0, 160)}`);
    }

    if (res.status === 401 && data?.sessionExpired) {
      setAuthenticated(false);
      throw new Error("Your session expired. Please sign in again.");
    }

    if (!res.ok) {
      throw new Error(data?.error?.message || data?.error || `HTTP ${res.status}`);
    }

    return data;
  }

async function handleLookup() {
  if (!address.trim()) return;

  setLoading(true);
  setError("");
  setResult(null);
  setIdwResult(null);
  setDolNexradHit(null);
  setPropCoords({ lat: null, lon: null });
  setFreezeLevelFt(null);
  setCorroboration(null);
  setNexradHits([]);
  setHailMapInspections([]);

  try {
    const storedToken = localStorage.getItem("hail_token");
    const authHeaders = {
      "Content-Type": "application/json",
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
    };

    // ── Step 1: Geocode via Google Maps API (deterministic, Daubert-defensible) ─
    const geocodeRes = await fetch(
      `${API}/api/geocode?address=${encodeURIComponent(address)}`,
      { credentials: "include", headers: authHeaders }
    );

    if (!geocodeRes.ok) {
      const errData = await geocodeRes.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || "Could not geocode address. Please try a more specific address.");
    }

    const geoJson = await geocodeRes.json();
    const lat = parseFloat(geoJson.lat);
    const lon = parseFloat(geoJson.lon);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error("Could not geocode address. Please try a more specific address.");
    }

    // Daubert-defensible geocoding record — logged for audit trail
    console.log(`Geocoded [${geoJson.locationType}]: ${geoJson.formattedAddress} → ${lat}, ${lon} · place_id: ${geoJson.placeId}`);

    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear - 10}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // ── Step 2: Fetch all three data sources in parallel ─────────────────────
const [noaaRes, lsrRes, stationsRes, stormEventsRes, nexradRes, spcmcdRes, freezingLevelRes, hailMapRes] = await Promise.all([
  fetch(
        `${API}/api/noaa/events?lat=${lat}&lon=${lon}&startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include", headers: authHeaders }
      ),
      fetch(
        `${API}/api/lsr?lat=${lat}&lon=${lon}&startDate=${startDate}&endDate=${endDate}&radius=25`,
        { credentials: "include", headers: authHeaders }
      ),
      dateOfLoss
        ? fetch(
            `${API}/api/stations?lat=${lat}&lon=${lon}&date=${dateOfLoss}`,
            { credentials: "include", headers: authHeaders }
          )
: Promise.resolve(null),
    fetch(
   `${API}/api/noaa/stormevents?lat=${lat}&lon=${lon}&startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include", headers: authHeaders }
      ),
      fetch(
  `${API}/api/nexrad?lat=${lat}&lon=${lon}`,
{ credentials: "include", headers: authHeaders, signal: AbortSignal.timeout(300000) }
),
      dateOfLoss
        ? fetch(
            `${API}/api/spcmcd?lat=${lat}&lon=${lon}&date=${dateOfLoss}`,
            { credentials: "include", headers: authHeaders }
          )
        : Promise.resolve(null),
      dateOfLoss
        ? fetch(
            `${API}/api/freezinglevel?lat=${lat}&lon=${lon}&date=${dateOfLoss}`,
            { credentials: "include", headers: authHeaders }
          )
        : Promise.resolve(null),
      fetch(
        `${API}/api/hailmap?lat=${lat}&lon=${lon}`,
        { credentials: "include", headers: authHeaders }
      ),    ]);
  
const [noaaData, lsrData, stationsData, stormEventsData, nexradData, spcmcdData, freezingLevelData, hailMapData] = await Promise.all([
      noaaRes.json(),
      lsrRes.json(),
      stationsRes ? stationsRes.json() : null,
      stormEventsRes.json(),
      nexradRes.json().catch((e) => { console.log('NEXRAD parse error:', e); return { hits: [] }; }),
      spcmcdRes ? spcmcdRes.json().catch(() => ({ mcds: [] })) : Promise.resolve({ mcds: [] }),
      freezingLevelRes ? freezingLevelRes.json().catch(() => ({ freezeLevelFt: null })) : Promise.resolve({ freezeLevelFt: null }),
      hailMapRes ? hailMapRes.json().catch(() => ({ inspections: [] })) : Promise.resolve({ inspections: [] }),
    ]);

    // — NEXRAD corroboration index ————————————————————————————
const nexradByDate = {};
(nexradData?.hits || []).forEach((h) => {
  if (!h.date) return;
  // Dates from Zoho are already in DD-MMM-YYYY format — use directly as key
  const key = h.date;
  if (!nexradByDate[key] || parseFloat(h.maxSizeIn) > parseFloat(nexradByDate[key].maxSizeIn)) {
    nexradByDate[key] = h;
  }
});
    // ── Step 3: Haversine distance filter ────────────────────────────────────
    function haversineDistance(lat1, lon1, lat2, lon2) {
      const R = 3958.8;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const nearbyEvents = (noaaData?.events || [])
      .filter((e) => {
        if (!e.lat || !e.lon) return true;
        return haversineDistance(lat, lon, e.lat, e.lon) <= 25;
      })
      .slice(0, 100);

    const nearbyLsr = (lsrData?.reports || [])
      .filter((r) => {
        if (!r.lat || !r.lon) return true;
        return haversineDistance(lat, lon, r.lat, r.lon) <= 25;
      })
      .slice(0, 50);

    // ── Step 4: Build prompt with all three tiers ─────────────────────────────
    const dataPayload = {
      property: {
        address,
        lat,
        lon,
        county: noaaData?.county,
        state: noaaData?.state,
      },
      dateOfLoss: dateOfLoss || null,
      lookbackYears: 10,
      dateRange: { start: startDate, end: endDate },
      tier1_lsr_hail_reports: nearbyLsr,
      tier2_storm_events: nearbyEvents,
      tier2_noaa_storm_events_hail: `${stormEventsData?.hailCount || 0} hail events confirmed in database — injected directly, do not regenerate`,
      tier2_noaa_storm_events_other: stormEventsData?.otherEvents || [],

      tier3_instructions: "Search the web for any additional hail or severe weather events near this property not already captured in Tier 1 or Tier 2 data. Search NOAA Storm Events, SPC storm reports, and NWS archives for this county.",
      stationObservations: stationsData || null,
    };

    const dateClause = dateOfLoss
      ? `\nDate of Loss: ${dateOfLoss}. Use the provided station observations to populate the stations array for IDW interpolation.`
      : "";

    const analysisMessages = [
      {
        role: "user",
  content: `You are a forensic weather analyst. Return a JSON report for this property.

PROPERTY: ${address}
COUNTY: ${stormEventsData?.county || noaaData?.county}, ${stormEventsData?.state || noaaData?.state}
COORDINATES: ${lat}, ${lon}
DATE OF LOSS: ${dateOfLoss || "Not provided"}
NEXRAD DOL HIT: ${(() => {
  if (!dateOfLoss) return "No date of loss provided.";
  const [dolYear, dolMonth, dolDay] = dateOfLoss.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmt = `${String(dolDay).padStart(2,"0")}-${months[dolMonth-1]}-${dolYear}`;
  const hit = (nexradData?.hits || []).find(h => h.date === fmt);
  return hit ? `WSR-88D site ${hit.radar} detected ${hit.maxSizeIn}" hail aloft on date of loss. POH: ${hit.probHail ?? "N/A"}%, POSH: ${hit.probSevere ?? "N/A"}%. This MUST be referenced in your summary.` : "No NEXRAD detection on date of loss.";
})()}
YOUR ONLY TASKS:
1. Write a 2-3 sentence forensic weather summary. Describe only what the data confirms — do not draw conclusions about conditions at the subject property itself. If DATE OF LOSS is provided, reference wind and precipitation from ASOS stations as regional conditions only. If NEXRAD data matches the date of loss, state the radar site, detection magnitude, and distance from the property (e.g. "WSR-88D radar site KHTX detected 3.00-inch hail aloft approximately 6.5 miles from the subject property"). NEVER say hail fell at the property, NEVER claim high confidence that the property was damaged, and NEVER use language like "establishes a forensic basis for damage." The correct posture is: a storm system affected the region, radar detected hail in the vicinity, and site-specific conditions require physical inspection to confirm. Hail swaths are typically 1 mile wide by 5 miles long — proximity to a detection does not confirm the property was impacted.
2. Format the Visual Crossing stations below into the stations array for IDW interpolation
3. Return these exact sources: ["https://www.ncdc.noaa.gov/stormevents/", "https://www.visualcrossing.com", "https://mesonet.agron.iastate.edu/lsr/", "https://www.ncei.noaa.gov/swdiws/csv/nx3hail/", "https://www.ofcm.gov/publications/fmh/FMH11/FMH11C.pdf", "https://www.ofcm.gov/publications/fmh/FMH11/FMH11B.pdf", "https://www.ofcm.gov/publications/fmh/FMH11/FMH11A.pdf"]

DO NOT populate hailEvents — leave it as [].
DO NOT populate otherEvents — leave it as [].
DO NOT search the web.

VISUAL CROSSING STATION DATA:
${stationsData ? JSON.stringify(stationsData, null, 2) : "No date of loss provided — return empty stations array."}

Return ONLY valid JSON with summary, riskLevel, hailEvents:[], otherEvents:[], stats:{}, sources:[], stations:[].`,

      },
    ];

    // ── Step 5: Claude analyzes data + fills gaps with web search ─────────────
    let data = null;
    let messages = analysisMessages;

    for (let i = 0; i < 4; i++) {
      data = await callAnthropic(messages, true);

      if (data?.stop_reason === "tool_use") {
        messages = [...messages, { role: "assistant", content: data.content }];
        const toolResults = (data.content || [])
          .filter((b) => b.type === "tool_use")
          .map((b) => ({
            type: "tool_result",
            tool_use_id: b.id,
            content: b.content ?? "Search completed.",
          }));
        messages = [...messages, { role: "user", content: toolResults }];
      } else {
        break;
      }
    }

    let parsed = extractJsonPayload(data);

    // Repair pass if needed
    if (!parsed) {
      const repairMessages = [
        ...messages,
        { role: "assistant", content: data.content },
        {
          role: "user",
          content: "Return the exact same answer as valid JSON only. Start with { and end with }.",
        },
      ];
      const repaired = await callAnthropic(repairMessages, false);
      parsed = extractJsonPayload(repaired);
    }

    if (!parsed) {
parsed = { location: { address, lat: String(lat), lon: String(lon), county: stormEventsData?.county || noaaData?.county, state: stormEventsData?.state || noaaData?.state }, summary: "Weather analysis based on NOAA Storm Events Database records.", riskLevel: "Moderate", hailEvents: [], otherEvents: [], stats: { totalHailEvents: 0, largestHailSize: "0", avgEventsPerYear: "0", mostActiveMonth: "N/A", yearsSearched: `${new Date().getFullYear()-10}-${new Date().getFullYear()}` }, sources: ["https://www.ncdc.noaa.gov/stormevents/"], stations: [] };    }

    // Ensure lat/lon are set from our geocode
    if (parsed.location) {
      parsed.location.lat = String(lat);
      parsed.location.lon = String(lon);
    }

if (!parsed) {
  parsed = { location: { address, lat: String(lat), lon: String(lon), county: noaaData?.county, state: noaaData?.state }, summary: "", riskLevel: "Moderate", hailEvents: [], otherEvents: [], stats: { totalHailEvents: 0, largestHailSize: "0", avgEventsPerYear: "0", mostActiveMonth: "N/A", yearsSearched: `${new Date().getFullYear()-10}-${new Date().getFullYear()}` }, sources: [], stations: [] };
}
const directHailEvents = stormEventsData.hailEvents
  .filter(e => {
    const mag = parseFloat(e.magnitude);
    return mag > 0 && mag <= 6 && e.magnitudeType !== "EG";
  })
  .map(e => ({
    date: e.date,
    size: `${e.magnitude} inches${(() => { const s = parseFloat(e.magnitude); if (s >= 4.50) return ' (Softball)'; if (s >= 4.00) return ' (Grapefruit)'; if (s >= 2.75) return ' (Baseball)'; if (s >= 2.50) return ' (Tennis Ball)'; if (s >= 1.75) return ' (Golf Ball)'; if (s >= 1.50) return ' (Ping Pong Ball)'; if (s >= 1.25) return ' (Half Dollar)'; if (s >= 1.00) return ' (Quarter)'; if (s >= 0.88) return ' (Nickel)'; if (s >= 0.75) return ' (Penny)'; if (s >= 0.50) return ' (Marble)'; if (s >= 0.25) return ' (Pea)'; return ''; })()}`,    location: e.location || `${stormEventsData.county}, ${stormEventsData.state}`,
    injuries: e.injuries || 0,
    deaths: e.deaths || 0,
    propertyDamage: e.propertyDamage || "N/A",
    source: "NOAA Storm Events Database",
        nexradCorroboration: nexradByDate[e.date] ? {
          maxSizeIn: nexradByDate[e.date].maxSizeIn,
          probHail: nexradByDate[e.date].probHail,
          probSevere: nexradByDate[e.date].probSevere,
          radar: nexradByDate[e.date].radar,
          corroborated: Math.abs(parseFloat(nexradByDate[e.date].maxSizeIn) - parseFloat(e.magnitude)) <= 0.25,
        } : null,
      }));
  // Build a set of Storm Events hail dates (in DD-MMM-YYYY format, matching NEXRAD)
  const stormEventsHailDates = new Set(
    directHailEvents.map(e => e.date).filter(Boolean)
  );

  // NEXRAD-only events: radar detections on dates with NO Storm Events record
  // These are displayed as standalone radar detections (not "corroborated")
  const nexradOnlyEvents = Object.values(nexradByDate)
    .filter(h => h.date && !stormEventsHailDates.has(h.date))
    .map(h => {
      const parts = h.date ? h.date.split("-") : [];
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const monthIdx = parts.length === 3 ? months.indexOf(parts[1]) : -1;
      const dateStr = parts.length === 3 && monthIdx !== -1
        ? `${parts[2]}-${String(monthIdx+1).padStart(2,"0")}-${parts[0].padStart(2,"0")}`
        : h.date || "Unknown";
      return {
        date: dateStr,
        size: `${h.maxSizeIn} inches${(() => { const s = parseFloat(h.maxSizeIn); if (s >= 4.50) return ' (Softball)'; if (s >= 4.00) return ' (Grapefruit)'; if (s >= 2.75) return ' (Baseball)'; if (s >= 2.50) return ' (Tennis Ball)'; if (s >= 1.75) return ' (Golf Ball)'; if (s >= 1.50) return ' (Ping Pong Ball)'; if (s >= 1.25) return ' (Half Dollar)'; if (s >= 1.00) return ' (Quarter)'; if (s >= 0.88) return ' (Nickel)'; if (s >= 0.75) return ' (Penny)'; if (s >= 0.50) return ' (Marble)'; if (s >= 0.25) return ' (Pea)'; return ''; })()}`,
        location: `${stormEventsData?.county || parsed.location?.county}, ${stormEventsData?.state || parsed.location?.state}`,
        source: "NEXRAD WSR-88D (NOAA SWDI)",
        nexradOnly: true,
        nexradCorroboration: {
          maxSizeIn: h.maxSizeIn,
          probHail: h.probHail ?? null,
          probSevere: h.probSevere ?? null,
          radar: h.radar,
          corroborated: false,
        },
      };
    });

  parsed.hailEvents = [
    ...directHailEvents,
    ...nexradOnlyEvents,
    ...(parsed.hailEvents || []),
  ];
  parsed.hailEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    
  parsed.otherEvents = (stormEventsData?.otherEvents || [])
  .filter(e => e.type && e.date && e.type !== "Hail")
  .map(e => ({
    date: e.date,
    type: e.type,
location: `${e.county || stormEventsData?.county}, ${e.state || stormEventsData?.state}`,
description: (() => {
  const windStr = (e.magnitude && parseFloat(e.magnitude) > 0) ? 
    `${Math.round(parseFloat(e.magnitude))} MPH ${({'EG':'(est. gust)','ES':'(est. sustained)','MG':'(meas. gust)','MS':'(meas. sustained)'}[e.magnitudeType] || '')} — ` : '';
  return windStr + (e.narrative ? e.narrative.slice(0, 150) : e.type);
})(),
damage: e.propertyDamage || "N/A",    
  }));
  const nexradHitCount = Object.keys(nexradByDate).length;
  // True corroboration = Storm Events record + NEXRAD detection on same date (two independent sources)
  const nexradCorroboratedCount = parsed.hailEvents.filter(e =>
    e.nexradCorroboration && !e.nexradOnly && e.source !== "NEXRAD WSR-88D (NOAA SWDI)"
  ).length;
  const nexradOnlyCount = parsed.hailEvents.filter(e => e.nexradOnly).length;
  const stormEventsOnlyCount = parsed.hailEvents.filter(e =>
    !e.nexradOnly && !e.nexradCorroboration && e.source === "NOAA Storm Events Database"
  ).length;
  parsed.stats = {
    totalHailEvents: parsed.hailEvents.length,
    nexradHits: nexradHitCount,
avgEventsPerYear: (parsed.hailEvents.length / 10).toFixed(1),
mostActiveMonth: (() => {
  const counts = {};
  parsed.hailEvents.forEach(e => {
    const month = new Date(e.date).toLocaleString('default', { month: 'long' });
    counts[month] = (counts[month] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
})(),
  largestHailSize: [...directHailEvents, ...nexradOnlyEvents].reduce((max, e) => {
  const size = parseFloat(e.size);
  return size > parseFloat(max) ? String(size) : max;
}, "0"),
riskLevel: (() => {
  const allEvents = [...directHailEvents, ...nexradOnlyEvents];
  const max = parseFloat(allEvents.reduce((m, e) => {
    const s = parseFloat(e.size);
    return s > parseFloat(m) ? String(s) : m;
  }, "0"));
  const count = allEvents.length;
  if (max >= 1.75 || count >= 10) return "High";
  if (max >= 1.00 || count >= 5) return "Moderate";
  if (max >= 0.75 || count >= 1) return "Low";
  return "None";
  })(),
  };
  parsed.riskLevel = parsed.stats.riskLevel;
const totalEvents = parsed.hailEvents.length;
    if (nexradCorroboratedCount > 0) {
      parsed.summary += ` Of ${totalEvents} recorded hail event${totalEvents !== 1 ? 's' : ''}, ${nexradCorroboratedCount} ${nexradCorroboratedCount !== 1 ? 'are' : 'is'} independently corroborated by both NOAA Storm Events ground reports and NEXRAD WSR-88D radar${nexradOnlyCount > 0 ? `, while ${nexradOnlyCount} additional event${nexradOnlyCount !== 1 ? 's were' : ' was'} detected by NEXRAD radar alone (no ground-truth spotter report on file)` : ''}.`;
    } else if (nexradOnlyCount > 0 && stormEventsOnlyCount === 0) {
      parsed.summary += ` All ${totalEvents} recorded hail event${totalEvents !== 1 ? 's were' : ' was'} detected by NEXRAD WSR-88D radar. No independent ground-truth spotter reports are on file in the NOAA Storm Events Database for these dates, which is common in rural counties with limited spotter coverage.`;
    }
    parsed.mcds = spcmcdData?.mcds || [];
    setNexradHits(nexradData?.hits || []);
    setHailMapInspections(hailMapData?.inspections || []);
    setResult(parsed);
    // ── Step 6: Run IDW if date of loss and stations returned ─────────────────
    
// Resolve DOL NEXRAD hit outside the IDW block so it's available for state
const dolNexradHit = dateOfLoss ? (() => {
  const [dolYear, dolMonth, dolDay] = dateOfLoss.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hDateFormatted = `${String(dolDay).padStart(2,"0")}-${months[dolMonth-1]}-${dolYear}`;
  return (nexradData?.hits || []).find(h => h.date === hDateFormatted) || null;
})() : null;

// Corroboration counts — convert DOL to DD-MMM-YYYY for Storm Events date matching
const dolFormatted = dateOfLoss ? (() => {
  const [dolYear, dolMonth, dolDay] = dateOfLoss.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(dolDay).padStart(2,"0")}-${months[dolMonth-1]}-${dolYear}`;
})() : null;
const dolHailCount = dolFormatted ? directHailEvents.filter(e => e.date === dolFormatted).length : 0;
const dolLsrCount  = nearbyLsr.filter(r => r.valid?.startsWith(dateOfLoss) || r.date === dateOfLoss).length;

setDolNexradHit(dolNexradHit);
setPropCoords({ lat, lon });
setFreezeLevelFt(freezingLevelData?.freezeLevelFt || null);
setCorroboration({ stormEventsHailCount: dolHailCount, lsrCount: dolLsrCount });

if (dateOfLoss && Array.isArray(stationsData?.stations) && stationsData.stations.length >= 2) {
      // Use backend-formatted stations directly from /api/stations.
      // Do NOT use parsed.stations (the Claude-rewritten copy) — Claude
      // sometimes drops windSpeedMph / windGustMph fields, producing NaN
      // wind values and NaN weight percentages in the IDW panel. The
      // backend already maps Visual Crossing per-station obs with
      // day-level fallback, so this is also more Daubert-defensible
      // (deterministic API → field mapping, no LLM transformation).
      const dolNexradHit = nexradData?.hits?.find(h => {
        const hDate = h.date;
        const [dolYear, dolMonth, dolDay] = dateOfLoss.split("-").map(Number);
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const hDateFormatted = `${String(dolDay).padStart(2,"0")}-${months[dolMonth-1]}-${dolYear}`;
        return hDate === hDateFormatted;
      });
      const freezeLevelFt = freezingLevelData?.freezeLevelFt || null;
      const idw = runIDW(lat, lon, stationsData.stations);
      setIdwResult(idw);
    }

  } catch (err) {
    setError(err.message || "Failed to retrieve weather data.");
  } finally {
    setLoading(false);
  }
}

  function getPdfPalette(mode) {
    if (mode === "light") {
      return {
        pageBg: [255, 255, 255], cardBg: [248, 250, 252], cellBg: [255, 255, 255], noteBg: [255, 251, 235],
        text: [15, 23, 42], headerText: [15, 23, 42], summaryText: [30, 41, 59],
        muted: [100, 116, 139], muted2: [148, 163, 184], muted3: [71, 85, 105], white: [15, 23, 42],
        border: [226, 232, 240], borderSoft: [226, 232, 240],
        hailGold: [180, 83, 9], green: [21, 128, 61], greenFill: [220, 252, 231], greenBorder: [134, 239, 172],
        orange: [180, 83, 9], orangeFill: [254, 243, 199], orangeBorder: [252, 211, 77],
        red: [185, 28, 28], blue: [37, 99, 235], blueMuted: [100, 116, 139], cyan: [6, 182, 212],
        purple: [109, 40, 217], amber: [180, 120, 0], amberBorder: [180, 120, 0], nullOrange: [194, 65, 12],
        logoSrc: "/SWI_Triangle_blk.png",
        lineColor: [226, 232, 240], fillColor: [255, 255, 255], headFill: [248, 250, 252], headText: [100, 116, 139],
        corrobBg: [248, 250, 252],
      };
    }
    return {
      pageBg: [3, 7, 15], cardBg: [8, 14, 26], cellBg: [5, 11, 20], noteBg: [10, 14, 24],
      text: [238, 243, 255], headerText: [232, 240, 255], summaryText: [210, 222, 240],
      muted: [126, 162, 223], muted2: [77, 103, 151], muted3: [120, 144, 184], white: [255, 255, 255],
      border: [23, 50, 95], borderSoft: [16, 34, 64],
      hailGold: [255, 203, 84], green: [76, 175, 80], greenFill: [14, 33, 25], greenBorder: [76, 175, 80],
      orange: [255, 176, 77], orangeFill: [41, 32, 24], orangeBorder: [255, 176, 77],
      red: [255, 107, 107], blue: [141, 183, 255], blueMuted: [126, 162, 223], cyan: [0, 220, 255],
      purple: [179, 149, 255], amber: [240, 180, 50], amberBorder: [122, 85, 0], nullOrange: [255, 156, 77],
      logoSrc: "/SWI_Triangle_Horizontal.png",
      lineColor: [16, 34, 64], fillColor: [5, 11, 20], headFill: [5, 11, 20], headText: [126, 162, 223],
      corrobBg: [8, 14, 26],
    };
  }

  async function downloadPDF(mode = "dark") {
    if (!normalized || !layoutReady || pages.length === 0) return;

    const setLoading = mode === "light" ? setPdfLightLoading : setPdfLoading;
    setLoading(true);

    try {
      const pal = getPdfPalette(mode);

      await document.fonts.ready;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
        compress: true,
      });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      // ── 1. Cover page (NATIVE TEXT — real selectable text, not a screenshot) ─
      // Background
      pdf.setFillColor(...pal.pageBg);
      pdf.rect(0, 0, pdfW, pdfH, "F");

      const margin = 40;
      let y = margin + 30; // top breathing room before logo

      // SWI logo — centered at top of cover
      let logoDataCache = null;
      try {
        const logoData = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d").drawImage(img, 0, 0);
            resolve({ dataUrl: canvas.toDataURL("image/png"), w: img.naturalWidth, h: img.naturalHeight });
          };
          img.onerror = reject;
          img.src = pal.logoSrc;
        });
        const logoW = 320;
        const logoH = (logoData.h / logoData.w) * logoW;
        const logoX = (pdfW - logoW) / 2;
        logoDataCache = logoData;
        pdf.addImage(logoData.dataUrl, "PNG", logoX, y, logoW, logoH);
        y += logoH + 28;
      } catch (e) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...pal.muted3);
        pdf.text("SEVERE WEATHER INTELLIGENCE", pdfW / 2, y, { charSpace: 1.5, align: "center" });
        y += 28;
      }

      // Trinity Engineering subtitle
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...pal.muted);
      pdf.text("Trinity Engineering, PLLC  ·  Forensic Storm Report", margin, y);
      y += 26;

      // Property address — large headline
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(...pal.headerText);
      const addrText = String(normalized.location.address || "");
      const addrLines = pdf.splitTextToSize(addrText, pdfW - margin * 2);
      pdf.text(addrLines, margin, y);
      y += addrLines.length * 22 + 2;

      // County / coords sub-line
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(...pal.muted);
      const coordsText = `${normalized.location.county || ""}  ·  ${parseFloat(normalized.location.lat || 0).toFixed(4)}°, ${parseFloat(normalized.location.lon || 0).toFixed(4)}°`;
      pdf.text(coordsText, margin, y);
      y += 22;

      // Divider
      pdf.setDrawColor(...pal.border);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pdfW - margin, y);
      y += 22;

      // Summary section header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...pal.muted3);
      pdf.text("WEATHER SUMMARY", margin, y, { charSpace: 1.2 });
      y += 16;

      // Summary body
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(...pal.summaryText);
      const summaryText = String(normalized.summary || "No summary available.");
      const summaryLines = pdf.splitTextToSize(summaryText, pdfW - margin * 2);
      const lineHeight = 14;
      for (let i = 0; i < summaryLines.length; i++) {
        if (y > pdfH - margin - lineHeight) {
          pdf.addPage();
          pdf.setFillColor(...pal.pageBg);
          pdf.rect(0, 0, pdfW, pdfH, "F");
          y = margin;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11);
          pdf.setTextColor(...pal.summaryText);
        }
        pdf.text(summaryLines[i], margin, y);
        y += lineHeight;
      }
      y += 14;

      // Stats grid
      if (normalized.stats && Object.keys(normalized.stats).length > 0) {
        if (y > pdfH - margin - 80) {
          pdf.addPage();
          pdf.setFillColor(...pal.pageBg);
          pdf.rect(0, 0, pdfW, pdfH, "F");
          y = margin;
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(...pal.muted3);
        pdf.text("AT-A-GLANCE", margin, y, { charSpace: 1.2 });
        y += 16;

        const statEntries = Object.entries(normalized.stats);
        const colW = (pdfW - margin * 2 - 12) / 2;
        for (let i = 0; i < statEntries.length; i += 2) {
          if (y > pdfH - margin - 40) {
            pdf.addPage();
            pdf.setFillColor(...pal.pageBg);
            pdf.rect(0, 0, pdfW, pdfH, "F");
            y = margin;
          }
          for (let c = 0; c < 2; c++) {
            const entry = statEntries[i + c];
            if (!entry) continue;
            const [label, value] = entry;
            const x = margin + c * (colW + 12);
            pdf.setFillColor(...pal.cardBg);
            pdf.setDrawColor(...pal.border);
            pdf.roundedRect(x, y, colW, 36, 4, 4, "FD");
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7);
            pdf.setTextColor(...pal.muted3);
            pdf.text(String(label).replace(/([A-Z])/g, " $1").trim().toUpperCase(), x + 8, y + 12, { charSpace: 1 });
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.setTextColor(...pal.headerText);
            pdf.text(String(value), x + 8, y + 28);
          }
          y += 42;
        }
        y += 8;
      }

      // Footer
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...pal.muted2);
      pdf.text(
        "© Trinity Engineering, PLLC  ·  Daubert-Defensible Forensic Weather Report",
        pdfW / 2, pdfH - 24, { align: "center" }
      );

      // ── 2. 10-year NEXRAD map page (capture at natural height, embed at aspect ratio) ──
      if (mapPageRef.current) {
        const mapNode = mapPageRef.current;
        await new Promise(function(resolve) { setTimeout(resolve, 1200); });
        const mapCanvas = await html2canvas(mapNode, {
          backgroundColor: theme.pageBg,
          scale: 1.5,
          useCORS: true,
          logging: false,
          windowWidth: PAGE_W,
          windowHeight: mapNode.scrollHeight || PAGE_H,
          width: PAGE_W,
          height: mapNode.scrollHeight || PAGE_H,
        });
        const mapImg = mapCanvas.toDataURL("image/jpeg", 0.72);
        const mapRatio = mapCanvas.height / mapCanvas.width;
        const mapEmbedH = pdfW * mapRatio;
        pdf.addPage();
        pdf.setFillColor(...pal.pageBg);
        pdf.rect(0, 0, pdfW, pdfH, "F");
        if (mapEmbedH <= pdfH) {
          pdf.addImage(mapImg, "JPEG", 0, 0, pdfW, mapEmbedH, undefined, "FAST");
        } else {
          const scaledW = pdfH / mapRatio;
          const xOffset = (pdfW - scaledW) / 2;
          pdf.addImage(mapImg, "JPEG", xOffset, 0, scaledW, pdfH, undefined, "FAST");
        }
      }

      // ── 3. DOL NEXRAD map page (only if DOL set) ─────────────────────────
      if (dateOfLoss && dolMapPdfRef.current) {
        const dolNode = dolMapPdfRef.current;
        const dolMapCanvas = await html2canvas(dolNode, {
          backgroundColor: theme.pageBg,
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          windowWidth: PAGE_W,
          windowHeight: PAGE_H,
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          x: 0,
          y: 0,
          width: PAGE_W,
          height: dolNode.scrollHeight || PAGE_H,
        });
        const dolImg = dolMapCanvas.toDataURL("image/jpeg", 0.85);
        const dolRatio = dolMapCanvas.height / dolMapCanvas.width;
        const dolNaturalH = pdfW * dolRatio;
        pdf.addPage();
        pdf.setFillColor(...pal.pageBg);
        pdf.rect(0, 0, pdfW, pdfH, "F");
        if (dolNaturalH <= pdfH) {
          pdf.addImage(dolImg, "JPEG", 0, 0, pdfW, dolNaturalH, undefined, "FAST");
        } else {
          const dolPages = Math.ceil(dolNaturalH / pdfH);
          for (let p = 0; p < dolPages; p++) {
            if (p > 0) { pdf.addPage(); pdf.setFillColor(...pal.pageBg); pdf.rect(0, 0, pdfW, pdfH, "F"); }
            pdf.addImage(dolImg, "JPEG", 0, -(p * pdfH), pdfW, dolNaturalH, undefined, "FAST");
          }
        }
      }

      // ── 3b. DOL data tables (NEXRAD hits + Inspections) — themed ──
      if (dateOfLoss && Array.isArray(nexradHits) && nexradHits.length > 0) {
        pdf.internal.events.subscribe("addPage", function () {
          pdf.setFillColor(...pal.pageBg);
          pdf.rect(0, 0, pdfW, pdfH, "F");
        });

        const dolPropLat = parseFloat(normalized.location.lat || 0);
        const dolPropLon = parseFloat(normalized.location.lon || 0);

        // Parse DOL date
        const [dolYr, dolMo, dolDy] = dateOfLoss.split("-").map(Number);
        const dolMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const dolFormattedStr = `${String(dolDy).padStart(2,"0")}-${dolMonths[dolMo-1]}-${dolYr}`;
        const dolDateObj = new Date(dolYr, dolMo - 1, dolDy);
        const oneYearBefore = new Date(dolDateObj.getTime() - 365 * 24 * 60 * 60 * 1000);
        const today = new Date();

        // Classify hits within 1yr-before to today; compute distance + surface size
        const hitsForTable = (nexradHits || []).map(function (h) {
          if (!h.date) return null;
          const parts = h.date.split("-");
          if (parts.length !== 3) return null;
          const monthIdx = dolMonths.indexOf(parts[1]);
          if (monthIdx === -1) return null;
          const hDate = new Date(parseInt(parts[2]), monthIdx, parseInt(parts[0]));
          if (hDate < oneYearBefore || hDate > today) return null;

          let category;
          if (h.date === dolFormattedStr) category = "DOL";
          else if (hDate < dolDateObj) category = "Prior";
          else category = "Post";

          const dLat = ((parseFloat(h.lat) - dolPropLat) * Math.PI) / 180;
          const dLon = ((parseFloat(h.lon) - dolPropLon) * Math.PI) / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(dolPropLat * Math.PI / 180) * Math.cos(parseFloat(h.lat) * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
          const distMi = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          const surface = freezeLevelFt ? meltingChartEstimate(parseFloat(h.maxSizeIn), freezeLevelFt) : null;
          const labelDate = `${parts[2]}.${String(monthIdx + 1).padStart(2, "0")}.${parts[0].padStart(2, "0")}`;

          return {
            labelDate: labelDate,
            category: category,
            aloftIn: h.maxSizeIn,
            surfaceIn: surface,
            distMi: distMi,
            radar: h.radar || "",
          };
        }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a.distMi - b.distMi; });

        if (hitsForTable.length > 0) {
          // New page for the data tables
          pdf.addPage();

          const dtMargin = 36;
          let dtY = dtMargin + 18;

          // Section title
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(13);
          pdf.setTextColor(...pal.text);
          pdf.text("DOL NEXRAD Hits — Sorted by Distance", dtMargin, dtY);
          dtY += 12;

          // Subtitle
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(7.5);
          pdf.setTextColor(...pal.muted);
          const dtNote = pdf.splitTextToSize(
            `${hitsForTable.length} NEXRAD detection${hitsForTable.length !== 1 ? "s" : ""} from one year before DOL through today. Aloft sizes per WSR-88D HDA (FMH-11 Part C §2.18). Surface sizes estimated via Knight (1981) using radiosonde freezing level.`,
            pdfW - dtMargin * 2
          );
          pdf.text(dtNote, dtMargin, dtY);
          dtY += dtNote.length * 9 + 6;

          autoTable(pdf, {
            head: [["Date", "Category", "Aloft", "Est. Surface", "Radar", "Distance"]],
            body: hitsForTable.map(function (h) {
              return [
                h.labelDate,
                h.category,
                `${h.aloftIn}"`,
                h.surfaceIn != null ? `${h.surfaceIn}"` : "—",
                h.radar || "—",
                `${h.distMi.toFixed(1)} mi`,
              ];
            }),
            startY: dtY,
            theme: "grid",
            margin: { left: dtMargin, right: dtMargin, top: dtMargin, bottom: dtMargin },
            styles: {
              font: "helvetica",
              fontSize: 8,
              cellPadding: 5,
              lineColor: pal.lineColor,
              lineWidth: 0.5,
              textColor: pal.text,
              fillColor: pal.fillColor,
              overflow: "linebreak",
              valign: "top",
            },
            headStyles: {
              fillColor: pal.headFill,
              textColor: pal.headText,
              fontStyle: "bold",
              fontSize: 7.5,
              cellPadding: 6,
              lineColor: pal.lineColor,
              lineWidth: 0.5,
            },
            columnStyles: {
              0: { cellWidth: 75, font: "courier", fontSize: 8.5 },
              1: { cellWidth: 55, fontStyle: "bold" },
              2: { cellWidth: 50, font: "courier", fontSize: 8.5, textColor: pal.hailGold },
              3: { cellWidth: 75, font: "courier", fontSize: 8.5, textColor: pal.blue },
              4: { cellWidth: 55, font: "courier", fontSize: 8.5 },
              5: { cellWidth: "auto", font: "courier", fontSize: 8.5 },
            },
            didParseCell: function (data) {
              if (data.section === "body" && data.column.index === 1) {
                const cat = data.cell.raw;
                if (cat === "DOL") data.cell.styles.textColor = [0, 220, 255];
                else if (cat === "Prior") data.cell.styles.textColor = [255, 176, 77];
                else if (cat === "Post") data.cell.styles.textColor = [255, 100, 80];
              }
            },
          });

          // Inspections table (if any)
          let inspY = pdf.lastAutoTable.finalY + 22;

          if (Array.isArray(hailMapInspections) && hailMapInspections.length > 0) {
            const inspForTable = hailMapInspections.map(function (insp) {
              if (insp.lat == null || insp.lon == null) return null;
              const dLat = ((insp.lat - dolPropLat) * Math.PI) / 180;
              const dLon = ((insp.lon - dolPropLon) * Math.PI) / 180;
              const a = Math.sin(dLat / 2) ** 2 + Math.cos(dolPropLat * Math.PI / 180) * Math.cos(insp.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
              const distMi = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              if (distMi > 50) return null;
              const inspDateObj = insp.inspectionDate ? new Date(insp.inspectionDate) : null;
              const validDate = inspDateObj && !isNaN(inspDateObj.getTime());
              const category = !validDate ? "—" : (inspDateObj <= dolDateObj ? "Prior" : "Post");
              return {
                inspectionDate: insp.inspectionDate || "—",
                category: category,
                dentsSizeIn: insp.dentsSizeIn,
                spatterSizeIn: insp.spatterSizeIn,
                distMi: distMi,
              };
            }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a.distMi - b.distMi; });

            if (inspForTable.length > 0) {
              if (inspY > pdfH - 100) {
                pdf.addPage();
                inspY = dtMargin + 18;
              }

              pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
              pdf.setTextColor(...pal.text);
              pdf.text("PE-Verified Inspections — Within 50 mi", dtMargin, inspY);
              inspY += 12;
              pdf.setFont("helvetica", "italic"); pdf.setFontSize(7.5);
              pdf.setTextColor(...pal.muted);
              pdf.text(
                `${inspForTable.length} field inspection${inspForTable.length !== 1 ? "s" : ""} verified by Trinity Engineering, PLLC`,
                dtMargin, inspY
              );
              inspY += 12;
              autoTable(pdf, {
                head: [["Date", "Category", "Dents Size", "Spatter Size", "Distance"]],
                body: inspForTable.map(function (insp) {
                  return [
                    insp.inspectionDate, insp.category,
                    insp.dentsSizeIn != null ? `${insp.dentsSizeIn}"` : "—",
                    insp.spatterSizeIn != null ? `${insp.spatterSizeIn}"` : "—",
                    `${insp.distMi.toFixed(1)} mi`,
                  ];
                }),
                startY: inspY,
                theme: "grid",
                margin: { left: dtMargin, right: dtMargin, top: dtMargin, bottom: dtMargin },
                styles: { font: "helvetica", fontSize: 8, cellPadding: 5, lineColor: pal.lineColor, lineWidth: 0.5, textColor: pal.text, fillColor: pal.fillColor, overflow: "linebreak", valign: "top" },
                headStyles: { fillColor: pal.headFill, textColor: pal.headText, fontStyle: "bold", fontSize: 7.5, cellPadding: 6, lineColor: pal.lineColor, lineWidth: 0.5 },
                columnStyles: {
                  0: { cellWidth: 90, font: "courier", fontSize: 8.5 },
                  1: { cellWidth: 60, fontStyle: "bold", textColor: pal.blue },
                  2: { cellWidth: 75, font: "courier", fontSize: 8.5, textColor: pal.blue },
                  3: { cellWidth: 75, font: "courier", fontSize: 8.5, textColor: pal.blue },
                  4: { cellWidth: "auto", font: "courier", fontSize: 8.5 },
                },
              });
            }
          }
        }
      }

      //      // ── 3c. IDW analysis page (NATIVE — light theme on dark, real text) ──
      if (idwResult) {
        // Auto-paint themed bg on every new page added during these sections
        pdf.internal.events.subscribe("addPage", function () {
          pdf.setFillColor(...pal.pageBg);
          pdf.rect(0, 0, pdfW, pdfH, "F");
        });

        pdf.addPage();

        const idwMargin = 36;
        let iy = idwMargin;

        const ensureSpace = function (needed) {
          if (iy + needed > pdfH - idwMargin) { pdf.addPage(); iy = idwMargin; }
        };

        const drawSectionHeader = function (label, citation) {
          ensureSpace(citation ? 36 : 28);
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5);
          pdf.setTextColor(...pal.muted);
          pdf.text(label, idwMargin, iy, { charSpace: 1.5 });
          iy += 10;
          if (citation) {
            pdf.setFont("helvetica", "italic"); pdf.setFontSize(7);
            pdf.setTextColor(...pal.muted2);
            pdf.text(citation, idwMargin, iy);
            iy += 6;
          }
          pdf.setDrawColor(...pal.borderSoft); pdf.setLineWidth(0.5);
          pdf.line(idwMargin, iy, pdfW - idwMargin, iy);
          iy += 12;
        };

        const drawMetricCards = function (cards) {
          const gap = 8; const cardH = 46;
          const cardW = (pdfW - idwMargin * 2 - gap * (cards.length - 1)) / cards.length;
          ensureSpace(cardH + 10);
          for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            const cx = idwMargin + i * (cardW + gap);
            pdf.setFillColor(...pal.cardBg); pdf.setDrawColor(...pal.border); pdf.setLineWidth(0.5);
            pdf.roundedRect(cx, iy, cardW, cardH, 4, 4, "FD");
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
            pdf.setTextColor(...pal.muted3);
            pdf.text((pdf.splitTextToSize(String(c.label).toUpperCase(), cardW - 12)[0] || ""), cx + 6, iy + 9, { charSpace: 0.8 });
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
            pdf.setTextColor(...pal.headerText);
            const valTrunc = pdf.splitTextToSize(String(c.value), cardW - 12)[0] || String(c.value);
            pdf.text(valTrunc, cx + 6, iy + 26);
            if (c.unit) {
              const valW = pdf.getTextWidth(valTrunc); // measure at 15pt bold BEFORE font change
              pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
              pdf.setTextColor(...pal.muted);
              pdf.text(c.unit, cx + 6 + valW + 3, iy + 26);
            }
            if (c.sublabel) {
              pdf.setFont("helvetica", "normal"); pdf.setFontSize(6);
              pdf.setTextColor(...pal.muted2);
              pdf.text((pdf.splitTextToSize(String(c.sublabel), cardW - 12)[0] || ""), cx + 6, iy + 38);
            }
          }
          iy += cardH + 10;
        };

        const drawMethodNote = function (text) {
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
          const wrapped = pdf.splitTextToSize(text, pdfW - idwMargin * 2 - 22);
          const noteH = wrapped.length * 10 + 14;
          ensureSpace(noteH);
          pdf.setFillColor(...pal.noteBg); pdf.setDrawColor(...pal.amberBorder); pdf.setLineWidth(0.5);
          pdf.roundedRect(idwMargin, iy, pdfW - idwMargin * 2, noteH, 3, 3, "FD");
          pdf.setFillColor(...pal.amber); pdf.rect(idwMargin, iy, 3, noteH, "F");
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
          pdf.setTextColor(...pal.amber);
          pdf.text("METHODOLOGY", idwMargin + 12, iy + 11, { charSpace: 1 });
          const tagW = pdf.getTextWidth("METHODOLOGY") + ("METHODOLOGY".length - 1) * 1 + 2;
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
          pdf.setTextColor(...pal.muted);
          if (wrapped.length > 0) {
            const firstFit = pdf.splitTextToSize(wrapped.join(" "), pdfW - idwMargin * 2 - 22 - tagW - 8);
            pdf.text(firstFit[0] || "", idwMargin + 14 + tagW + 4, iy + 11);
            const remainingText = wrapped.join(" ").substring((firstFit[0] || "").length).trim();
            if (remainingText) pdf.text(pdf.splitTextToSize(remainingText, pdfW - idwMargin * 2 - 22), idwMargin + 14, iy + 22);
          }
          iy += noteH + 10;
        };

        // ── Page header — DATE OF LOSS ANALYSIS ─────────────────────────
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
        pdf.setTextColor(...pal.text);
        pdf.text("DATE OF LOSS ANALYSIS", idwMargin, iy + 10);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
        pdf.setTextColor(...pal.muted2);
        pdf.text("SITE-SPECIFIC STORM INTERPOLATION", idwMargin, iy + 22, { charSpace: 1.8 });
        const rightX = pdfW - idwMargin;
        pdf.setTextColor(...pal.muted2);
        pdf.text("NEXRAD DATA ANALYSIS", rightX, iy + 6, { align: "right", charSpace: 0.8 });
        pdf.text("IDW INTERPOLATION ENGINE v1.0.0", rightX, iy + 16, { align: "right", charSpace: 0.8 });
        pdf.text("NOAA NWS · NCEI STORM EVENTS", rightX, iy + 26, { align: "right", charSpace: 0.8 });
        iy += 32;
        pdf.setDrawColor(...pal.borderSoft); pdf.setLineWidth(0.5);
        pdf.line(idwMargin, iy, pdfW - idwMargin, iy);
        iy += 14;
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
        pdf.setTextColor(...pal.muted2);
        pdf.text("STORM DATA MODULE  ·  MULTI-SOURCE DOL ANALYSIS v2.0", idwMargin, iy, { charSpace: 1.2 });
        iy += 11;
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
        pdf.setTextColor(...pal.text);
        pdf.text("Date-of-Loss Storm Analysis", idwMargin, iy);
        iy += 12;
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
        pdf.setTextColor(...pal.muted);
        const subStr = `${normalized.location.address}  ·  ${dateOfLoss}`;
        pdf.text(subStr, idwMargin, iy);
        iy += 18;

        // ════════════════════════════════════════════════════════════════
        // SECTION 1 — NEXRAD HAIL ANALYSIS
        // ════════════════════════════════════════════════════════════════
        drawSectionHeader("NEXRAD HAIL ANALYSIS", "NWS WSR-88D · FMH-11 Part C §2.18");

        if (!dolNexradHit) {
          // Null result callout
          ensureSpace(36);
          ensureSpace(36);
          pdf.setFillColor(...pal.cardBg);
          pdf.setDrawColor(...pal.border);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(idwMargin, iy, pdfW - idwMargin * 2, 32, 4, 4, "FD");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(...pal.nullOrange);
          pdf.text("[NULL RESULT]", idwMargin + 8, iy + 12);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(...pal.muted);
          const nullText = pdf.splitTextToSize(
            "No WSR-88D hail detection within search radius for this date of loss. This is a null result — not a zero probability statement. Absence of radar detection does not confirm absence of hail; beam geometry limitations may apply at extended range.",
            pdfW - idwMargin * 2 - 16
          );
          pdf.text(nullText, idwMargin + 8, iy + 22);
          iy += 32 + 10 + (nullText.length - 1) * 9;
        } else {
          const posh = dolNexradHit.probSevere;
          const poh = dolNexradHit.probHail;
          const maxAloft = parseFloat(dolNexradHit.maxSizeIn);

          drawMetricCards([
            { label: "Hail Probability (POSH)", value: posh != null ? posh : "—", unit: posh != null ? "%" : "", sublabel: 'prob. severe hail >= 0.75" at surface' },
            { label: "Hail Probability (POH)", value: poh != null ? poh : "—", unit: poh != null ? "%" : "", sublabel: "prob. any hail at surface" },
            { label: "Max Size Aloft", value: maxAloft, unit: "in", sublabel: "WSR-88D HDA — not ground level" },
            { label: "Detecting Radar", value: dolNexradHit.radar || "—", unit: "", sublabel: "NWS WSR-88D site" },
          ]);

          // Beam geometry box
          const beamGeo = dolNexradHit?.radar && propCoords.lat
            ? getBeamGeometry(propCoords.lat, propCoords.lon, dolNexradHit.radar)
            : null;
          if (beamGeo) {
            const boxH = 44;
            ensureSpace(boxH + 10);
            pdf.setFillColor(8, 14, 26);
            pdf.setDrawColor(23, 50, 95);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(idwMargin, iy, pdfW - idwMargin * 2, boxH, 4, 4, "FD");

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(7);
            pdf.setTextColor(120, 144, 184);
            pdf.text("BEAM GEOMETRY  ·  FMH-11 PART C", idwMargin + 8, iy + 11, { charSpace: 1.2 });

            const cells = [
              ["Radar Site", beamGeo.radarId],
              ["Distance", `${beamGeo.distMi} mi`],
              ["Beam Bottom", `${beamGeo.beamBottom} ft AGL`],
              ["Beam Center", `${beamGeo.beamCenter} ft AGL`],
              ["Beam Width", `${beamGeo.beamWidth} ft`],
              ["Reliability", String(beamGeo.reliability).toUpperCase()],
            ];
            const cellW = (pdfW - idwMargin * 2 - 16) / cells.length;
            for (let i = 0; i < cells.length; i++) {
              const cx = idwMargin + 8 + i * cellW;
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(6.5);
              pdf.setTextColor(120, 144, 184);
              pdf.text(cells[i][0], cx, iy + 24);
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(9);
              if (cells[i][0] === "Reliability") {
                if (beamGeo.reliability === "reliable") pdf.setTextColor(76, 175, 80);
                else if (beamGeo.reliability === "marginal") pdf.setTextColor(255, 176, 77);
                else pdf.setTextColor(255, 107, 107);
              } else {
                pdf.setTextColor(232, 240, 255);
              }
              pdf.text(String(cells[i][1]), cx, iy + 36);
            }
            iy += boxH + 10;
          }

          drawMethodNote("POSH and POH values are NWS operational products derived from the WSR-88D Hail Detection Algorithm (HDA). POSH represents the probability of severe hail (>=0.75 in) at the surface, accounting for reflectivity thresholds and freezing level height. POH represents probability of any hail occurrence. These are published NWS products derived from nationally calibrated algorithms — not proprietary estimates. Per FMH-11 Part C §2.18. Max size represents detection aloft; surface size is estimated below via Knight (1981).");
        }

        // ════════════════════════════════════════════════════════════════
        // SECTION 2 — EST. SURFACE HAIL SIZE
        // ════════════════════════════════════════════════════════════════
        if (dolNexradHit && freezeLevelFt) {
          const aloftSize = parseFloat(dolNexradHit.maxSizeIn);
          const surfaceSize = meltingChartEstimate(aloftSize, freezeLevelFt);
          if (surfaceSize != null) {
            iy += 4;
            drawSectionHeader("EST. SURFACE HAIL SIZE", "Knight (1981) NCAR Hail Melting Chart · U. of Wyoming Radiosonde Archive");

            drawMetricCards([
              { label: "Radar Size (Aloft)", value: aloftSize, unit: "in", sublabel: "WSR-88D HDA detection" },
              { label: "Freezing Level", value: freezeLevelFt.toLocaleString(), unit: "ft", sublabel: "radiosonde 0°C interpolation" },
              { label: "Est. Surface Size", value: surfaceSize, unit: "in", sublabel: "after melting descent" },
            ]);

            drawMethodNote("Surface hail size estimated using exponential decay model: surfaceSize = aloftSize × e^(−k × freezeLevelFt), where k = 0.000055, per Knight (1981) empirical regression from NCAR hail melting data. Freezing level derived from University of Wyoming upper-air sounding archive, interpolated linearly to 0°C isotherm. This estimate represents expected hail size at ground level after thermal descent through the warm layer below the freezing level. Actual surface size may vary with local atmospheric conditions.");
          }
        }

                // ════════════════════════════════════════════════════════════════
        // SECTION 3 — WIND INTERPOLATION
        // ════════════════════════════════════════════════════════════════
        if (idwResult) {
          const r = idwResult;
          iy += 4;
          drawSectionHeader("WIND INTERPOLATION", "IDW Spatial Interpolation (Shepard, 1968) · ASOS / Visual Crossing");

          drawMetricCards([
            { label: "Wind Speed", value: r.windSpeedMph, unit: "mph", sublabel: "sustained" },
            { label: "Wind Gust", value: r.windGustMph, unit: "mph", sublabel: "peak gust" },
            { label: "Station Count", value: r.stationCount, unit: "", sublabel: "contributing ASOS" },
            { label: "Nearest Station", value: `${r.nearestStationMiles} mi`, unit: "", sublabel: r.nearestStationName || "" },
          ]);

          // ── IDW confidence bar ──
          ensureSpace(40);
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
          pdf.setTextColor(...pal.muted3);
          pdf.text("IDW CONFIDENCE", idwMargin, iy + 6, { charSpace: 1.2 });
          const badgeLabel = String(r.confidenceLabel || "").toUpperCase();
          const badgeX = idwMargin + pdf.getTextWidth("IDW CONFIDENCE") + ("IDW CONFIDENCE".length - 1) * 1.2 + 8;
          let badgeFill = pal.greenFill, badgeBorder = pal.green, badgeInk = pal.green;
          if (r.confidence < 0.55) { badgeFill = [41,18,18]; badgeBorder = pal.red; badgeInk = pal.red; }
          else if (r.confidence < 0.75) { badgeFill = pal.orangeFill; badgeBorder = pal.orange; badgeInk = pal.orange; }
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
          const badgeW = pdf.getTextWidth(badgeLabel) + 10;
          pdf.setFillColor(...badgeFill); pdf.setDrawColor(...badgeBorder); pdf.setLineWidth(0.4);
          pdf.roundedRect(badgeX, iy, badgeW, 11, 1.5, 1.5, "FD");
          pdf.setTextColor(...badgeInk);
          pdf.text(badgeLabel, badgeX + 5, iy + 7.5);
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
          pdf.setTextColor(...pal.blue);
          pdf.text(`${(r.confidence * 100).toFixed(0)}%`, pdfW - idwMargin, iy + 7, { align: "right" });
          iy += 14;
          pdf.setFillColor(...pal.borderSoft);
          pdf.roundedRect(idwMargin, iy, pdfW - idwMargin * 2, 5, 1.5, 1.5, "F");
          let fillColor = pal.green;
          if (r.confidence < 0.55) fillColor = pal.red;
          else if (r.confidence < 0.75) fillColor = pal.orange;
          const fillW = (pdfW - idwMargin * 2) * r.confidence;
          pdf.setFillColor(...fillColor);
          if (fillW > 3) pdf.roundedRect(idwMargin, iy, fillW, 5, 1.5, 1.5, "F");
          iy += 9;
          pdf.setFont("helvetica", "italic"); pdf.setFontSize(6.5);
          pdf.setTextColor(...pal.muted3);
          pdf.text("Tiers are qualitative indicators per IDW validation literature (Shepard, 1968; Dirks et al., 1998) — not frequentist probability statements.", idwMargin, iy + 5);
          iy += 14;

          // ── Station Table ──
          if (Array.isArray(r.stationsUsed) && r.stationsUsed.length > 0) {
            ensureSpace(20);
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
            pdf.setTextColor(...pal.muted3);
            pdf.text("STATIONS CONTRIBUTING TO WIND ESTIMATE", idwMargin, iy, { charSpace: 1.2 });
            iy += 8;
            autoTable(pdf, {
              head: [["Station", "Source", "Distance", "Weight"]],
              body: r.stationsUsed.map(function (s) {
                return [s.name || "—", s.source || "—", `${s.distanceMiles} mi`, `${s.contributionPct}%`];
              }),
              startY: iy,
              theme: "grid",
              margin: { left: idwMargin, right: idwMargin, top: idwMargin, bottom: idwMargin },
              styles: { font: "helvetica", fontSize: 8, cellPadding: 4, lineColor: pal.lineColor, lineWidth: 0.5, textColor: pal.text, fillColor: pal.fillColor, overflow: "linebreak", valign: "middle" },
              headStyles: { fillColor: pal.headFill, textColor: pal.headText, fontStyle: "bold", fontSize: 7, cellPadding: 5, lineColor: pal.lineColor, lineWidth: 0.5 },
              columnStyles: {
                0: { font: "courier", fontSize: 8 },
                1: { font: "courier", fontSize: 8, textColor: pal.muted },
                2: { font: "courier", fontSize: 8, cellWidth: 70 },
                3: { font: "courier", fontSize: 8, cellWidth: 70, textColor: pal.blue },
              },
            });
            iy = pdf.lastAutoTable.finalY + 12;
          }

          // ── Metadata grid ──
          const metaRows = [
            ["Method", r.method || "—"],
            ["Version", r.methodVersion || "—"],
            ["Computed (UTC)", r.computedAt ? new Date(r.computedAt).toUTCString() : "—"],
            ["Station Count", String(r.stationCount ?? "—")],
            ["Nearest Station", r.nearestStationName ? `${r.nearestStationName} (${r.nearestStationMiles} mi)` : "—"],
            ["Raw Confidence", `${(r.confidence * 100).toFixed(1)}%`],
          ];
          const metaBoxH = 56;
          ensureSpace(metaBoxH + 8);
          pdf.setFillColor(...pal.cardBg); pdf.setDrawColor(...pal.border); pdf.setLineWidth(0.5);
          pdf.roundedRect(idwMargin, iy, pdfW - idwMargin * 2, metaBoxH, 4, 4, "FD");
          const metaColW = (pdfW - idwMargin * 2 - 16) / 3;
          for (let i = 0; i < metaRows.length; i++) {
            const col = i % 3; const row = Math.floor(i / 3);
            const cx = idwMargin + 8 + col * metaColW;
            const cy = iy + 8 + row * 24;
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5);
            pdf.setTextColor(...pal.muted3);
            pdf.text(metaRows[i][0].toUpperCase(), cx, cy + 6, { charSpace: 0.8 });
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
            pdf.setTextColor(...pal.muted);
            pdf.text(pdf.splitTextToSize(String(metaRows[i][1]), metaColW - 8)[0] || "", cx, cy + 16);
          }
          iy += metaBoxH + 10;

          drawMethodNote(`Wind speed and gust derived by IDW Spatial Interpolation (Shepard, 1968) across ${r.stationCount} ASOS surface stations. Station weights = 1/d^2 (Haversine distance). ASOS instrumentation does not detect hail occurrence and is not used for hail probability — hail probability is derived exclusively from NEXRAD POSH per FMH-11 Part C §2.18. Confidence score reflects station proximity and wind data consistency only. Visual Crossing / ASOS observations are federally quality-controlled using range, temporal consistency, and neighbor comparison checks per ASOS standards (Dirks et al., 1998).`);
        }

                // ════════════════════════════════════════════════════════════════
        // SECTION 4 — CORROBORATION SUMMARY
        // ════════════════════════════════════════════════════════════════
        if (true) {
          iy += 4;
          drawSectionHeader("CORROBORATION SUMMARY", "NOAA Storm Events Database · IEM LSR · NEXRAD SWDI");
          const corroLines = [];
                    if ((corroboration && corroboration.stormEventsHailCount > 0)) {
            corroLines.push({ label: "YES", fill: pal.greenFill, border: pal.green, ink: pal.green, text: `${corroboration.stormEventsHailCount} NOAA Storm Events Database hail record(s) confirmed for this county on ${dateOfLoss}.` });
          } else {
            corroLines.push({ label: "N/A", fill: pal.borderSoft, border: pal.muted2, ink: pal.muted, text: `No NOAA Storm Events Database hail records for this county on ${dateOfLoss}.` });
          }
          if ((corroboration && corroboration.lsrCount > 0)) {
            corroLines.push({ label: "YES", fill: pal.greenFill, border: pal.green, ink: pal.green, text: `${corroboration.lsrCount} IEM Local Storm Report(s) from trained spotters within 25 miles on date of loss.` });
          } else {
            corroLines.push({ label: "N/A", fill: pal.borderSoft, border: pal.muted2, ink: pal.muted, text: `No IEM Local Storm Reports within 25 miles on date of loss.` });
          }
          if (dolNexradHit) {
            corroLines.push({ label: "YES", fill: pal.greenFill, border: pal.green, ink: pal.green, text: `NEXRAD WSR-88D (${dolNexradHit.radar || "site unknown"}) independently detected ${dolNexradHit.maxSizeIn}" hail aloft on date of loss per FMH-11 Part C §2.18.` });
          } else {
            corroLines.push({ label: "NULL", fill: pal.orangeFill, border: pal.nullOrange, ink: pal.nullOrange, text: `No NEXRAD WSR-88D detection within search radius on date of loss.` });
          }
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            const lineLayouts = corroLines.map(function(ln) {
              const wrapped = pdf.splitTextToSize(ln.text, pdfW - idwMargin * 2 - 74);
              return Object.assign({}, ln, { wrapped: wrapped, h: Math.max(wrapped.length * 10 + 4, 18) });
            });
            const corrBoxH = lineLayouts.reduce(function(a, ln) { return a + ln.h; }, 0) + 16 + (lineLayouts.length - 1) * 8;
            ensureSpace(corrBoxH);
            ensureSpace(corrBoxH);
            pdf.setFillColor(...pal.corrobBg); pdf.setDrawColor(...pal.border); pdf.setLineWidth(0.5);
            pdf.roundedRect(idwMargin, iy, pdfW - idwMargin * 2, corrBoxH, 4, 4, "FD");
            let lineY = iy + 10;
            for (let i = 0; i < lineLayouts.length; i++) {
              const ln = lineLayouts[i];
              pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
              const pillW = pdf.getTextWidth(ln.label) + 12;
              pdf.setFillColor(...ln.fill); pdf.setDrawColor(...ln.border); pdf.setLineWidth(0.4);
              pdf.roundedRect(idwMargin + 8, lineY, pillW, 11, 2, 2, "FD");
              pdf.setTextColor(...ln.ink);
              pdf.text(ln.label, idwMargin + 14, lineY + 7.5);
              pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
              pdf.setTextColor(...pal.muted);
              pdf.text(ln.wrapped, idwMargin + 8 + pillW + 8, lineY + 8);
              lineY += ln.h;
              if (i < lineLayouts.length - 1) {
                pdf.setDrawColor(...pal.borderSoft); pdf.setLineWidth(0.3);
                pdf.line(idwMargin + 8, lineY + 4, pdfW - idwMargin - 8, lineY + 4);
                lineY += 8;
              }
            }
            iy += corrBoxH + 10;
          } // closes if(true) — Section 4

          // ════════════════════════════════════════════════════════════════
          // SECTION 5 — MESOSCALE DISCUSSIONS
          // ════════════════════════════════════════════════════════════════
          if (normalized && Array.isArray(normalized.mcds) && normalized.mcds.length > 0) {
            iy += 4;
            drawSectionHeader("MESOSCALE DISCUSSIONS — DATE OF LOSS", "NOAA Storm Prediction Center");
            const mcdInnerW = pdfW - idwMargin * 2 - 16;
            const mcdLayouts = normalized.mcds.map(function(mcd) {
              const concerning = mcd.concerning || "Severe weather threat identified";
              pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
              const concWrapped = pdf.splitTextToSize(concerning, mcdInnerW);
              const urlWrapped = pdf.splitTextToSize(mcd.url || "", mcdInnerW);
              return { mcd, concWrapped, urlWrapped, h: 12 + 4 + (concWrapped.length * 9) + 4 + (urlWrapped.length * 9) };
            });
            const mcdBoxH = mcdLayouts.reduce(function(a,l){return a+l.h;},0) + 16 + (mcdLayouts.length-1)*8;
            ensureSpace(mcdBoxH);
            pdf.setFillColor(...pal.cardBg); pdf.setDrawColor(...pal.border); pdf.setLineWidth(0.5);
            pdf.roundedRect(idwMargin, iy, pdfW-idwMargin*2, mcdBoxH, 4, 4, "FD");
            let mcdY = iy + 10;
            for (let i = 0; i < mcdLayouts.length; i++) {
              const ml = mcdLayouts[i]; const m = ml.mcd;
              pdf.setFont("helvetica","bold"); pdf.setFontSize(8.5); pdf.setTextColor(...pal.blue);
              pdf.text(`MCD #${String(m.number).padStart(4,"0")}  ·  ${m.issued ? new Date(m.issued).toUTCString().slice(0,22) : "—"} UTC`, idwMargin+8, mcdY+6);
              mcdY += 12;
              pdf.setFont("helvetica","normal"); pdf.setFontSize(7.5); pdf.setTextColor(...pal.muted);
              pdf.text(ml.concWrapped, idwMargin+8, mcdY+6);
              mcdY += ml.concWrapped.length*9+4;
              pdf.setTextColor(...pal.blue);
              pdf.text(ml.urlWrapped, idwMargin+8, mcdY+4);
              mcdY += ml.urlWrapped.length*9+4;
              if (i < mcdLayouts.length-1) {
                pdf.setDrawColor(...pal.borderSoft); pdf.setLineWidth(0.3);
                pdf.line(idwMargin+8, mcdY+2, pdfW-idwMargin-8, mcdY+2);
                mcdY += 8;
              }
            }
            iy += mcdBoxH + 10;
          }

        } // closes if(idwResult) — Section 3c

     // ── 4. IDW analysis page — now rendered natively in section 3c above ──

      // ── 5. Events tables + Sources (NATIVE — dark theme, real text) ──────
      // Auto-paint dark navy background on every new page added from here on.
      pdf.internal.events.subscribe("addPage", function () {
        pdf.setFillColor(...pal.pageBg);
        pdf.rect(0, 0, pdfW, pdfH, "F");
      });

      pdf.addPage();

      const tableMargin = 36;
      let tableY = tableMargin + 18;

      const propLatNum = parseFloat(normalized.location.lat || 0);
      const propLonNum = parseFloat(normalized.location.lon || 0);

      // ─── Hail Events title + footnote ────────────────────────────────────
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(238, 243, 255);
      pdf.text("Hail Events — Past 10 Years", tableMargin, tableY);
      tableY += 12;

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7.5);
      pdf.setTextColor(126, 162, 223);
      const hailNote = pdf.splitTextToSize(
        'All hail sizes represent maximum detection aloft by WSR-88D radar per FMH-11 Part C §2.18. Ground-level size may differ due to melting during descent.',
        pdfW - tableMargin * 2
      );
      pdf.text(hailNote, tableMargin, tableY);
      tableY += hailNote.length * 9 + 6;

      // ─── Hail Events table body ──────────────────────────────────────────
      const hailRows = normalized.hailEvents || [];

      if (hailRows.length === 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(126, 162, 223);
        pdf.text("No hail events returned.", tableMargin, tableY + 14);
        tableY += 30;
      } else {
        // Build cell text — autoTable uses this to compute row heights;
        // we re-render the size column manually in didDrawCell with colors.
        const hailBody = hailRows.map(function (r) {
          const sizeVal = r.size || "N/A";
          const tagText = r.nexradCorroboration ? (r.nexradOnly ? "Radar Only" : "Corroborated") : "";
          let content = tagText ? `${sizeVal}  ${tagText}` : sizeVal;
          if (r.nexradCorroboration) {
            const corroSuffix = r.nexradCorroboration.corroborated ? " (Corroborated)" : " (independent radar detection)";
            const radarSuffix = r.nexradCorroboration.radar ? ` · ${r.nexradCorroboration.radar}` : "";
            content += `\nNEXRAD (WSR-88D) ${r.nexradCorroboration.maxSizeIn}" aloft (per FMH-11 Part C §2.18)${corroSuffix}${radarSuffix}`;
            if (r.nexradCorroboration.probHail != null || r.nexradCorroboration.probSevere != null) {
              let pohText = "";
              if (r.nexradCorroboration.probHail != null) pohText += `POH: ${r.nexradCorroboration.probHail}%`;
              if (r.nexradCorroboration.probHail != null && r.nexradCorroboration.probSevere != null) pohText += " · ";
              if (r.nexradCorroboration.probSevere != null) pohText += `POSH: ${r.nexradCorroboration.probSevere}% (prob. severe hail >= 0.75" at surface)`;
              content += `\n${pohText}`;
            }
            const geo = r.nexradCorroboration.radar ? getBeamGeometry(propLatNum, propLonNum, r.nexradCorroboration.radar) : null;
            if (geo) {
              content += `\n${geo.radarId} · ${geo.distMi} mi · beam center ${geo.beamCenter} ft (${geo.reliability}) · per FMH-11 Part B`;
            }
          }
          return [formatDate(r.date), content, r.location || "N/A"];
        });

        autoTable(pdf, {
          head: [["Date", "Size & Corroboration", "Location"]],
          body: hailBody,
          startY: tableY,
          theme: "grid",
          margin: { left: tableMargin, right: tableMargin, top: tableMargin, bottom: tableMargin },
          styles: { font: "helvetica", fontSize: 8, cellPadding: 5, lineColor: pal.lineColor, lineWidth: 0.5, textColor: pal.text, fillColor: pal.fillColor, overflow: "linebreak", valign: "top" },
          headStyles: { fillColor: pal.headFill, textColor: pal.headText, fontStyle: "bold", fontSize: 7.5, cellPadding: 6, lineColor: pal.lineColor, lineWidth: 0.5 },
          columnStyles: {
            0: { cellWidth: 70, font: "courier", fontSize: 8.5 },
            1: { cellWidth: "auto" },
            2: { cellWidth: 110, font: "courier", fontSize: 8.5 },
          },
          willDrawCell: function (data) {
            // Skip default text rendering for the Size & Corroboration cell;
            // we paint it ourselves in didDrawCell with multi-color content.
            if (data.section === "body" && data.column.index === 1) {
              data.cell.text = [];
            }
          },
          didDrawCell: function (data) {
            if (data.section !== "body" || data.column.index !== 1) return;
            const r = hailRows[data.row.index];
            if (!r) return;
            const cellPad = 5;
            const x = data.cell.x + cellPad;
            let yy = data.cell.y + cellPad + 7;
            const maxWidth = data.cell.width - cellPad * 2;

            const sizeVal = r.size || "N/A";
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5);
            pdf.setTextColor(...pal.hailGold);
            pdf.text(sizeVal, x, yy);

            if (r.nexradCorroboration) {
              const sizeWidth = pdf.getTextWidth(sizeVal);
              const tagLabel = r.nexradOnly ? "Radar Only" : "Corroborated";
              const tagFill = r.nexradOnly ? pal.orangeFill : pal.greenFill;
              const tagBorder = r.nexradOnly ? pal.orangeBorder : pal.greenBorder;
              const tagInk = r.nexradOnly ? pal.orange : pal.green;
              pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5);
              const tagW = pdf.getTextWidth(tagLabel) + 8;
              const tagX = x + sizeWidth + 6;
              const tagY = yy - 7;
              pdf.setFillColor(...tagFill); pdf.setDrawColor(...tagBorder); pdf.setLineWidth(0.4);
              pdf.roundedRect(tagX, tagY, tagW, 9, 1.5, 1.5, "FD");
              pdf.setTextColor(...tagInk);
              pdf.text(tagLabel, tagX + 4, tagY + 6.5);
            }
            yy += 11;

            if (r.nexradCorroboration) {
              const isCorr = r.nexradCorroboration.corroborated;
              pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
              pdf.setTextColor(...(isCorr ? pal.green : pal.muted2));
              const corroSuffix = isCorr ? " (Corroborated)" : " (independent radar detection)";
              const radarSuffix = r.nexradCorroboration.radar ? ` · ${r.nexradCorroboration.radar}` : "";
              const nexradLines = pdf.splitTextToSize(`NEXRAD (WSR-88D) ${r.nexradCorroboration.maxSizeIn}" aloft (per FMH-11 Part C §2.18)${corroSuffix}${radarSuffix}`, maxWidth);
              pdf.text(nexradLines, x, yy);
              yy += nexradLines.length * 8;

              if (r.nexradCorroboration.probHail != null || r.nexradCorroboration.probSevere != null) {
                pdf.setTextColor(...pal.blueMuted);
                let pohText = "";
                if (r.nexradCorroboration.probHail != null) pohText += `POH: ${r.nexradCorroboration.probHail}%`;
                if (r.nexradCorroboration.probHail != null && r.nexradCorroboration.probSevere != null) pohText += " · ";
                if (r.nexradCorroboration.probSevere != null) pohText += `POSH: ${r.nexradCorroboration.probSevere}% (prob. severe hail >= 0.75" at surface)`;
                const pohLines = pdf.splitTextToSize(pohText, maxWidth);
                pdf.text(pohLines, x, yy);
                yy += pohLines.length * 8;
              }

              const geo = r.nexradCorroboration.radar ? getBeamGeometry(propLatNum, propLonNum, r.nexradCorroboration.radar) : null;
              if (geo) {
                if (geo.reliability === "reliable") pdf.setTextColor(...pal.green);
                else if (geo.reliability === "marginal") pdf.setTextColor(...pal.orange);
                else pdf.setTextColor(...pal.red);
                const geoLines = pdf.splitTextToSize(`${geo.radarId} · ${geo.distMi} mi · beam center ${geo.beamCenter} ft (${geo.reliability}) · per FMH-11 Part B`, maxWidth);
                pdf.text(geoLines, x, yy);
              }
            }
          },
        });

        tableY = pdf.lastAutoTable.finalY + 22;
      }

      // ─── Other Severe Weather Events title + table ───────────────────────
      const otherRows = normalized.otherEvents || [];

      if (tableY > pdfH - 90) {
        pdf.addPage();
        tableY = tableMargin + 18;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(238, 243, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...pal.text);
      pdf.text("Other Severe Weather Events", tableMargin, tableY);
      tableY += 10;
      if (otherRows.length === 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...pal.muted);
        pdf.text("No additional severe weather events returned.", tableMargin, tableY + 14);
        tableY += 30;
      } else {
        autoTable(pdf, {
          head: [["Date", "Type", "Location", "Description", "Damage"]],
          body: otherRows.map(function (r) {
            return [formatDate(r.date), r.type || "N/A", r.location || "N/A", r.description || "N/A", r.damage || "N/A"];
          }),
          startY: tableY,
          theme: "grid",
          margin: { left: tableMargin, right: tableMargin, top: tableMargin, bottom: tableMargin },
          styles: { font: "helvetica", fontSize: 8, cellPadding: 5, lineColor: pal.lineColor, lineWidth: 0.5, textColor: pal.text, fillColor: pal.fillColor, overflow: "linebreak", valign: "top" },
          headStyles: { fillColor: pal.headFill, textColor: pal.headText, fontStyle: "bold", fontSize: 7.5, cellPadding: 6, lineColor: pal.lineColor, lineWidth: 0.5 },
          columnStyles: {
            0: { cellWidth: 70, font: "courier", fontSize: 8.5 },
            1: { cellWidth: 70, fontStyle: "bold", textColor: pal.purple },
            2: { cellWidth: 90, font: "courier", fontSize: 8 },
            3: { cellWidth: "auto" },
            4: { cellWidth: 60, textColor: pal.orange },
          },
        });

        tableY = pdf.lastAutoTable.finalY + 22;
      }

      // ─── Data Sources block ──────────────────────────────────────────────
      const sourcesArr = normalized.sources || [];

      if (tableY > pdfH - 80) {
        pdf.addPage();
        tableY = tableMargin + 18;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(238, 243, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...pal.text);
      pdf.text("Data Sources", tableMargin, tableY);
      tableY += 16;

      if (sourcesArr.length === 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...pal.muted);
        pdf.text("No source links returned.", tableMargin, tableY);
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        for (let si = 0; si < sourcesArr.length; si++) {
          const s = sourcesArr[si];
          const wrapped = pdf.splitTextToSize(`${si + 1}.  ${s}`, pdfW - tableMargin * 2);
          const blockHeight = wrapped.length * 11 + 4;
          if (tableY + blockHeight > pdfH - tableMargin) {
            pdf.addPage();
            tableY = tableMargin + 18;
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8.5);
          }
          pdf.setTextColor(...pal.muted);
          pdf.text(wrapped, tableMargin, tableY);
          tableY += blockHeight;
        }
      }

      const countyName = String(normalized.location.county || "report")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      const streetAddress = String(normalized.location.address || "")
        .split(",")[0]
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const queryDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const fileName = `SWIReport.${streetAddress}.${countyName}.${queryDate}.pdf`;

      // ── Disclaimer page ──────────────────────────────────────────────────
      pdf.addPage();
      pdf.setFillColor(...pal.pageBg);
      pdf.rect(0, 0, pdfW, pdfH, "F");

      const discMargin = 50;
      let dy = discMargin;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...pal.text);
      pdf.text("DISCLAIMER & METHODOLOGICAL LIMITATIONS", discMargin, dy, { charSpace: 0.8 });
      dy += 6;
      pdf.setDrawColor(...pal.border);
      pdf.setLineWidth(0.5);
      pdf.line(discMargin, dy, pdfW - discMargin, dy);
      dy += 16;

      const discParagraphs = [
        "The meteorological data presented in this report was obtained from the Severe Weather Intelligence (SWI) platform developed by Trinity Engineering, PLLC, and is drawn from the following federal sources: the NOAA National Centers for Environmental Information (NCEI) Storm Events Database, NEXRAD Level-III WSR-88D radar hail detection algorithms (per Federal Meteorological Handbook No. 11, Part C, §2.18), ASOS station observations via Visual Crossing, IEM Local Storm Reports, as well as empirical evidence from forensic inspections performed by Trinity Engineering, PLLC. All data sources other than PE verified inspections are publicly available, reproducible, and independently verifiable.",
        "The forensic engineer notes the following known limitations of remotely-sensed meteorological data: (1) NEXRAD radar detects hail aloft at elevation, not at the surface — ground-level hail size may differ due to melting during descent, a function of freezing level height and fall distance; (2) NOAA Storm Events records are county-level and rely on human reporters, which may result in underreporting in some jurisdictions; (3) hail swaths are typically 1 mile wide by 5 miles long and are not static, sometimes moving at 30-50mph, meaning radar detections in the vicinity of a property do not confirm impact at the specific subject property, nor do radar detections outside the direct vicinity of the subject property necessarily rule out the possibility that the particular event may have affected the subject property.",
        "Where Trinity Engineering has conducted a physical inspection of the subject property, empirical field observations take precedence over all remotely-sensed data. Physical evidence of hail impact — including spatter marks on oxidized or otherwise coated surfaces and dents to soft metals and other impact-receptive surfaces — constitutes direct, site-specific confirmation of hail occurrence and size that no radar or database record can replicate. Field measurements of hail dent and spatter diameter, documented by a licensed Professional Engineer, represent the highest evidentiary tier in this analysis and are not subject to the geographic and atmospheric limitations inherent in remote sensing products. Any meteorological data collected and analyzed is only intended for use as a supplement to a physical inspection.",
      ];

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...pal.summaryText);
      const discLineH = 13;

      for (let pi = 0; pi < discParagraphs.length; pi++) {
        const lines = pdf.splitTextToSize(discParagraphs[pi], pdfW - discMargin * 2);
        for (let li = 0; li < lines.length; li++) {
          if (dy > pdfH - 80) {
            pdf.addPage();
            pdf.setFillColor(...pal.pageBg);
            pdf.rect(0, 0, pdfW, pdfH, "F");
            dy = discMargin;
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.5);
            pdf.setTextColor(...pal.summaryText);
          }
          pdf.text(lines[li], discMargin, dy);
          dy += discLineH;
        }
        dy += 10; // paragraph gap
      }

      // ── Footer on every page ─────────────────────────────────────────────
      const footerLogoW = 120;
      const footerLogoH = logoDataCache ? (logoDataCache.h / logoDataCache.w) * footerLogoW : 0;
      const footerY = pdfH - 30;
      const totalPages = pdf.internal.getNumberOfPages();

      for (let fp = 1; fp <= totalPages; fp++) {
        pdf.setPage(fp);
        // Divider
        pdf.setDrawColor(...pal.border);
        pdf.setLineWidth(0.3);
        pdf.line(40, footerY - 10, pdfW - 40, footerY - 10);
        // Copyright centered
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...pal.muted2);
        pdf.text(
          "© Trinity Engineering, PLLC  ·  All Rights Reserved  ·  Daubert-Defensible Forensic Weather Report",
          pdfW / 2, footerY, { align: "center" }
        );
        // Page number right-aligned
        pdf.text(`Page ${fp} of ${totalPages}`, pdfW - 40, footerY, { align: "right" });
      }

      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const dlLink = document.createElement("a");
      dlLink.href = pdfUrl;
      dlLink.download = fileName;
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (err) {
      setError(`PDF generation failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  if (authChecking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: theme.bg,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        Checking session...
      </div>
    );
  }

  if (!authenticated) {
    if (authScreen === "otp") {
      return (
        <OtpVerifyScreen
          email={resetEmail}
          onVerified={(code) => { setResetCode(code); setAuthScreen("new-password"); }}
          onGoLogin={() => setAuthScreen("login")}
          onResend={() => setAuthScreen("forgot")}
        />
      );
    }
    if (authScreen === "new-password") {
      return (
        <NewPasswordScreen
          email={resetEmail}
          code={resetCode}
          onResetSuccess={handleAuthSuccess}
        />
      );
    }
    if (authScreen === "signup") {
      return (
        <SignupScreen
          onSignupSuccess={handleAuthSuccess}
          onGoLogin={() => setAuthScreen("login")}
        />
      );
    }
    if (authScreen === "forgot") {
      return (
        <ForgotPasswordScreen
          onEmailSent={(email) => { setResetEmail(email); setAuthScreen("otp"); }}
          onGoLogin={() => setAuthScreen("login")}
        />
      );
    }
    return (
      <LoginScreen
        onLoginSuccess={handleAuthSuccess}
        onGoSignup={() => setAuthScreen("signup")}
        onGoForgot={() => setAuthScreen("forgot")}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <AppHeader onLogout={handleLogout} />

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "16px 16px 40px" }}>
        <SearchPanel
          address={address}
          setAddress={setAddress}
          dateOfLoss={dateOfLoss}
          setDateOfLoss={setDateOfLoss}
          onLookup={handleLookup}
          loading={loading}
        />

        {error ? (
          <div
            style={{
              marginBottom: 16,
              color: "#ff9c9c",
              background: "#220b12",
              border: "1px solid #5d1c2b",
              padding: "12px 14px",
              borderRadius: 10,
            }}
          >
            {error}
          </div>
        ) : null}

        {!normalized ? (
          <Panel>
            <SectionLabel>Status</SectionLabel>
            <div style={{ color: theme.muted, lineHeight: 1.8 }}>
              Enter a property address and run the query. The report preview and PDF export will appear after results are returned.
            </div>
          </Panel>
        ) : !layoutReady ? (
          <Panel>
            <SectionLabel>Layout</SectionLabel>
            <div style={{ color: theme.muted, lineHeight: 1.8 }}>
              Preparing the report layout...
            </div>
          </Panel>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: theme.white,
                    fontWeight: 800,
                    fontSize: 18,
                    marginBottom: 4,
                  }}
                >
                  Report ready
                </div>
                <div
                  style={{
                    color: theme.muted,
                    fontSize: 13,
                  }}
                >
                  {normalized.location.address}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <SlideDownloadButton onDownload={() => downloadPDF("dark")} loading={pdfLoading} label="SLIDE FOR DARK PDF ›" />
                <SlideDownloadButton onDownload={() => downloadPDF("light")} loading={pdfLightLoading} label="SLIDE FOR LIGHT PDF ›" />
              </div>
            </div>

            <div className="hail-report-scroll">
              <ReportPreview
                data={normalized}
                address={address}
                pages={pages}
              />
              {/* Map preview */}
              <div style={{ marginTop:18, width:"100%", overflowX:"auto", borderRadius:14, border:`1px solid ${theme.borderSoft}`, background:"#01040a", padding:10 }}>
                <div style={{ width:PAGE_W }}>
                  <HailMapPage data={normalized} nexradHits={nexradHits} inspections={hailMapInspections} preview />
                </div>
              </div>
            </div>

            {/* DOL Analysis — shows whenever Date of Loss is set */}
            {dateOfLoss && normalized && (
              <div style={{ marginTop: 20 }}>
                {idwResult ? (
                  <>
                    <div
                      style={{
                        color: "#4d6797",
                        fontSize: 9,
                        letterSpacing: "0.15em",
                        fontFamily: '"IBM Plex Mono", monospace',
                        marginBottom: 10,
                        textTransform: "uppercase",
                      }}
                    >
                      IDW Storm Interpolation · Date of Loss Analysis
                    </div>
                    <IDWPanel
                      idwResult={idwResult}
                      nexradHit={dolNexradHit}
                      beamGeometry={dolNexradHit?.radar && propCoords.lat ? getBeamGeometry(propCoords.lat, propCoords.lon, dolNexradHit.radar) : null}
                      freezeLevelFt={freezeLevelFt}
                      corroboration={corroboration}
                      dateOfLoss={dateOfLoss}
                      propertyAddress={normalized.location.address}
                      mcds={normalized?.mcds || []}
                    />
                  </>
                ) : (
                  <div
                    style={{
                      marginBottom: 16,
                      background: "#050b14",
                      border: "1px solid #17325f",
                      borderRadius: 10,
                      padding: "14px 18px",
                      color: "#4d6797",
                      fontSize: 12,
                      fontFamily: '"IBM Plex Mono", monospace',
                    }}
                  >
                    ◇ IDW interpolation requires ≥ 2 nearby stations for {dateOfLoss}. No station data was returned for this date — wind interpolation skipped, but NEXRAD hail history is shown below.
                  </div>
                )}
                <DolNexradMap
                  data={normalized}
                  nexradHits={nexradHits}
                  dateOfLoss={dateOfLoss}
                  idwResult={idwResult}
                  freezeLevelFt={freezeLevelFt}
                  inspections={hailMapInspections}
                />
              </div>
            )}
          </>
        )}
      </div>

      {normalized ? (
        <>
          <div
            style={{
              position: "absolute",
              left: -30000,
              top: 0,
              width: PAGE_W,
              pointerEvents: "none",
              opacity: 0,
            }}
          >
            <div ref={introMeasureRef} style={{ width: PAGE_W }}>
              <ReportIntro data={normalized} address={address} />
            </div>

            <div ref={hailBaseMeasureRef} style={{ width: PAGE_W }}>
              <HailEventsTable rows={[]} title="Hail Events - Past 10 Years" style={{ marginBottom: 0 }} />
            </div>

            {normalized.hailEvents.map((row, i) => (
  <div
    key={`measure-hail-row-${i}`}
    ref={(el) => { hailRowMeasureRefs.current[i] = el; }}
    style={{
      display: "grid",
      gridTemplateColumns: HAIL_COLUMNS.map((c) => c.width).join(" "),
      padding: "13px 18px",
      fontSize: 13,
      lineHeight: 1.35,
      width: PAGE_W - 44,
    }}
  >
    <div style={monoCellStyle}>{formatDate(row.date)}</div>
    <div style={{ ...monoCellStyle, color: "#ffcb54", fontWeight: 700 }}>
      {row.size || "N/A"}
      {row.nexradCorroboration && (
        <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3 }}>
          {`NEXRAD (WSR-88D) ${row.nexradCorroboration.maxSizeIn}" aloft`}
          {(row.nexradCorroboration.probHail != null || row.nexradCorroboration.probSevere != null) && (
            <div style={{ marginTop: 2, fontSize: 9 }}>
              {row.nexradCorroboration.probHail != null && `POH: ${row.nexradCorroboration.probHail}%`}
              {row.nexradCorroboration.probSevere != null && ` · POSH: ${row.nexradCorroboration.probSevere}%`}
            </div>
          )}
            {row.nexradCorroboration.radar && (
            <div style={{ marginTop: 2, fontSize: 9 }}>
              {`${row.nexradCorroboration.radar} · ${getBeamGeometry(parseFloat(normalized?.location?.lat || 0), parseFloat(normalized?.location?.lon || 0), row.nexradCorroboration.radar)?.distMi} mi · beam bottom ${getBeamGeometry(parseFloat(normalized?.location?.lat || 0), parseFloat(normalized?.location?.lon || 0), row.nexradCorroboration.radar)?.beamBottom} ft · beam center ${getBeamGeometry(parseFloat(normalized?.location?.lat || 0), parseFloat(normalized?.location?.lon || 0), row.nexradCorroboration.radar)?.beamCenter} ft · beam width ${getBeamGeometry(parseFloat(normalized?.location?.lat || 0), parseFloat(normalized?.location?.lon || 0), row.nexradCorroboration.radar)?.beamWidth} ft · per FMH-11 Part B beam geometry`}
            </div>
          )}
        </div>
      )}
    </div>
    <div style={monoCellStyle}>{row.location || "N/A"}</div>
  </div>
))}

            <div ref={otherBaseMeasureRef} style={{ width: PAGE_W }}>
              <OtherEventsTable rows={[]} title="Other Severe Weather Events" style={{ marginBottom: 0 }} />
            </div>

            {normalized.otherEvents.map((row, i) => (
              <div
                key={`measure-other-row-${i}`}
                ref={(el) => {
                  otherRowMeasureRefs.current[i] = el;
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: OTHER_COLUMNS.map((c) => c.width).join(" "),
                  padding: "13px 18px",
                  fontSize: 13,
                  lineHeight: 1.35,
                  width: PAGE_W - 44,
                }}
              >
                <div style={monoCellStyle}>{formatDate(row.date)}</div>
                <div style={{ ...monoCellStyle, color: theme.purpleText, fontWeight: 700 }}>
                  {row.type || "N/A"}
                </div>
                <div style={monoCellStyle}>{row.description || "N/A"}</div>
                <div style={{ ...monoCellStyle, color: theme.dangerText }}>
                  {row.damage || "N/A"}
                </div>
              </div>
            ))}

            <div ref={sourcesBaseMeasureRef} style={{ width: PAGE_W }}>
              <SourcesBlock sources={[]} style={{ marginBottom: 0 }} />
            </div>

            {normalized.sources.map((s, i) => (
              <div
                key={`measure-source-row-${i}`}
                ref={(el) => {
                  sourceRowMeasureRefs.current[i] = el;
                }}
                style={{
                  color: theme.blue,
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 12,
                  lineHeight: 1.7,
                  marginBottom: 6,
                  wordBreak: "break-all",
                  width: PAGE_W - 44,
                }}
           >
        {(() => {
          const labels = {
            "https://www.ncdc.noaa.gov/stormevents/": "NOAA Storm Events Database",
            "https://www.visualcrossing.com": "Visual Crossing / ASOS Station Network — federally maintained ASOS observations with range, temporal consistency, and neighbor comparison QC",
            "https://mesonet.agron.iastate.edu/lsr/": "IEM Local Storm Reports",
            "https://www.ncei.noaa.gov/swdiws/csv/nx3hail/": "NEXRAD Level-III Hail Detection (NOAA SWDI)",
            "https://www.ofcm.gov/publications/fmh/FMH11/FMH11C.pdf": "FMH-11 Part C §2.18 — WSR-88D Hail Index Algorithm (reflectivity thresholds, HDA logic)",
            "https://www.ofcm.gov/publications/fmh/FMH11/FMH11B.pdf": "FMH-11 Part B — WSR-88D Beam Geometry & Physics (hail aloft vs. ground-level detection)",
            "https://www.ofcm.gov/publications/fmh/FMH11/FMH11A.pdf": "FMH-11 Part A — WSR-88D Data Provenance & External User Access Rights",
          };
          const label = labels[s];
          return label ? (
            <span>↗ <strong>{label}</strong><br/><span style={{fontSize:10, opacity:0.7}}>{s}</span></span>
          ) : (
            <span>↗ {s}</span>
          );
        })()}
      </div>
    ))}

            <div ref={footerMeasureRef} style={{ width: PAGE_W }}>
              <FooterMeasure />
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: -20000,
              top: 0,
              width: PAGE_W,
              pointerEvents: "none",
            }}
          >
            {layoutReady &&
              pages.map((page, idx) => (
                <div
                  key={`pdf-${idx}`}
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  style={{ width: PAGE_W, height: PAGE_H, marginBottom: 20 }}
                >
                  <ReportPage page={page} data={normalized} address={address} />
                </div>
              ))}
            {/* Hidden Map PDF page */}
            {normalized && (
              <div ref={mapPageRef} style={{ width:PAGE_W }}>
                <HailMapPage data={normalized} nexradHits={nexradHits} inspections={hailMapInspections} />
              </div>
            )}
            {/* Hidden DOL Map PDF page */}
            {dateOfLoss && normalized && (
              <div ref={dolMapPdfRef} style={{ width:PAGE_W, background:theme.pageBg, padding:"28px 22px", boxSizing:"border-box" }}>
              <div style={{ color:theme.muted2, fontSize:9, letterSpacing:"0.15em", fontFamily:'"IBM Plex Mono", monospace', textTransform:"uppercase", marginBottom:12 }}>
               NEXRAD Recent Hail History · Date of Loss Analysis
            </div>
            <DolNexradMap data={normalized} nexradHits={nexradHits} dateOfLoss={dateOfLoss} idwResult={idwResult} freezeLevelFt={freezeLevelFt} inspections={hailMapInspections} mapOnly />
            </div>
            )}
            {/* IDW PDF page now rendered natively — hidden div removed */}
          </div>
        </>
      ) : null}
    </div>
  );
}
