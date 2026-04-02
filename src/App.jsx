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
import { runIDW, IDWPanel } from "./IDWModule";
import DatePicker from "./DatePicker";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
function HailMapPage({ data, nexradHits = [], preview = false }) {
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
function DolNexradMap({ data, nexradHits = [], dateOfLoss }) {
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

        {/* Hit list panel — below map */}
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
                        <span style={{ color:"#eef3ff" }}>{h.maxSizeIn}"</span>
                        <span>{h.distMi.toFixed(1)} mi</span>
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
        </div>
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
Cross-reference each station with any Tier 1 LSR hail reports within 10 miles on the same date.
If LSR confirms hail near a station, set hailSizeIn to that magnitude and hailProbability to 85.
If no LSR hail near a station, set hailSizeIn to 0 and hailProbability to 5.
Return empty array [] when no Date of Loss is provided.`;


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
const FOOTER_EXTRA_GAP = 20;

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

    return {
      showTopHeader,
      showIntro,
      sections: [],
      showFooter: false,
      remaining: capacity - introHeight,
    };
  }

  function pushNewPage(opts = {}) {
    const page = createPage(opts);
    pages.push(page);
    return page;
  }

  let currentPage = pushNewPage({ showTopHeader: true, showIntro: true });

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
function SlideDownloadButton({ onDownload, loading }) {
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
            SLIDE TO DOWNLOAD ›
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
                style={{ height: 20, width: "auto", objectFit: "contain" }}
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

  const [dateOfLoss, setDateOfLoss] = useState("");
  const [idwResult, setIdwResult] = useState(null);

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
  const mapPageRef = useRef(null);
  const dolMapPdfRef = useRef(null);

  const pageRefs = useRef([]);
  const idwPdfRef = useRef(null);

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
  setNexradHits([]);

  try {
    const storedToken = localStorage.getItem("hail_token");
    const authHeaders = {
      "Content-Type": "application/json",
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
    };

    // ── Step 1: Geocode via Claude (fast, no tools) ──────────────────────────
    const geocodeMessages = [
      {
        role: "user",
        content: `Return ONLY a JSON object with lat and lon for this address: ${address}
Example: {"lat": "35.9029", "lon": "-77.5266"}
No prose. No markdown. Just the JSON.`,
      },
    ];

    const geoData = await callAnthropic(geocodeMessages, false);
    let lat, lon;

    try {
      const geoJson = extractJsonPayload(geoData);
      lat = parseFloat(geoJson?.lat);
      lon = parseFloat(geoJson?.lon);
    } catch {
      throw new Error("Could not geocode address. Please try a more specific address.");
    }

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error("Could not geocode address. Please try a more specific address.");
    }

    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear - 10}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // ── Step 2: Fetch all three data sources in parallel ─────────────────────
const [noaaRes, lsrRes, stationsRes, stormEventsRes, nexradRes, spcmcdRes] = await Promise.all([
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
        : Promise.resolve(null),    ]);
  
const [noaaData, lsrData, stationsData, stormEventsData, nexradData, spcmcdData, freezingLevelData] = await Promise.all([
      noaaRes.json(),
      lsrRes.json(),
      stationsRes ? stationsRes.json() : null,
      stormEventsRes.json(),
      nexradRes.json().catch((e) => { console.log('NEXRAD parse error:', e); return { hits: [] }; }),
      spcmcdRes ? spcmcdRes.json().catch(() => ({ mcds: [] })) : Promise.resolve({ mcds: [] }),
      freezingLevelRes ? freezingLevelRes.json().catch(() => ({ freezeLevelFt: null })) : Promise.resolve({ freezeLevelFt: null }),
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

YOUR ONLY TASKS:
1. Write a 2-3 sentence forensic weather summary
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
  parsed.hailEvents = [
    ...directHailEvents,
    ...(parsed.hailEvents || []),
  ];
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
  const nexradCorroboratedCount = parsed.hailEvents.filter(e => e.nexradCorroboration !== null).length;
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
  largestHailSize: directHailEvents.reduce((max, e) => {
  const size = parseFloat(e.size);
  return size > parseFloat(max) ? String(size) : max;
}, "0"),
riskLevel: (() => {
  const max = parseFloat(directHailEvents.reduce((m, e) => {
    const s = parseFloat(e.size);
    return s > parseFloat(m) ? String(s) : m;
  }, "0"));
  const count = directHailEvents.length;
  if (max >= 1.75 || count >= 10) return "High";
  if (max >= 1.00 || count >= 5) return "Moderate";
  if (max >= 0.75 || count >= 1) return "Low";
  return "None";
})(),
  };
parsed.riskLevel = parsed.stats.riskLevel;
if (nexradCorroboratedCount > 0) {
      parsed.summary += ` ${nexradCorroboratedCount} of ${parsed.hailEvents.length} recorded hail event${parsed.hailEvents.length !== 1 ? 's' : ''} were independently detected by NEXRAD WSR-88D radar, providing multi-source corroboration.`;
    }
    parsed.mcds = spcmcdData?.mcds || [];
    setNexradHits(nexradData?.hits || []);
    setResult(parsed);
    // ── Step 6: Run IDW if date of loss and stations returned ─────────────────
    if (dateOfLoss && Array.isArray(parsed?.stations) && parsed.stations.length >= 2) {
      const dolNexradHit = nexradData?.hits?.find(h => {
        const hDate = h.date;
        const [dolYear, dolMonth, dolDay] = dateOfLoss.split("-").map(Number);
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const hDateFormatted = `${String(dolDay).padStart(2,"0")}-${months[dolMonth-1]}-${dolYear}`;
        return hDate === hDateFormatted;
      });
      const freezeLevelFt = freezingLevelData?.freezeLevelFt || null;
      const idw = runIDW(lat, lon, parsed.stations, dolNexradHit || null, 2, freezeLevelFt);
      setIdwResult(idw);
    }

  } catch (err) {
    setError(err.message || "Failed to retrieve weather data.");
  } finally {
    setLoading(false);
  }
}

  async function downloadPDF() {
    if (!normalized || !layoutReady || pages.length === 0) return;

    setPdfLoading(true);

    try {
      await document.fonts.ready;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i += 1) {
        const node = pageRefs.current[i];
        if (!node) continue;

        const canvas = await html2canvas(node, {
          backgroundColor: theme.pageBg,
          scale: 2.2,
          useCORS: true,
          logging: false,
          windowWidth: PAGE_W,
          windowHeight: PAGE_H,
        });

        const img = canvas.toDataURL("image/png");

        if (i > 0) pdf.addPage();
        // Ensure dark background on every page before placing image
        pdf.setFillColor(3, 7, 15);
        pdf.rect(0, 0, pdfW, pdfH, "F");
        pdf.addImage(img, "PNG", 0, 0, pdfW, pdfH, undefined, "FAST");
      }
      // Add map page
      if (mapPageRef.current) {
        const mapCanvas = await html2canvas(mapPageRef.current, {
          backgroundColor: theme.pageBg,
          scale: 2.2,
          useCORS: true,
          logging: false,
          windowWidth: PAGE_W,
          windowHeight: PAGE_H,
        });
        pdf.addPage();
        pdf.setFillColor(3, 7, 15);
        pdf.rect(0, 0, pdfW, pdfH, "F");
        pdf.addImage(mapCanvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, pdfH, undefined, "FAST");
      }
      // Add DOL map page
      if (idwResult && dolMapPdfRef.current) {
        const dolMapCanvas = await html2canvas(dolMapPdfRef.current, {
          backgroundColor: theme.pageBg,
          scale: 2.2,
          useCORS: true,
          logging: false,
          windowWidth: PAGE_W,
          height: dolMapPdfRef.current.scrollHeight,
        });
        pdf.addPage();
        pdf.setFillColor(3, 7, 15);
        pdf.rect(0, 0, pdfW, pdfH, "F");
        const dolRatio = dolMapCanvas.height / dolMapCanvas.width;
        const dolH = Math.min(pdfW * dolRatio, pdfH);
        pdf.addImage(dolMapCanvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, dolH, undefined, "FAST");
      }
      // Add IDW page if date of loss was set and IDW computed
      if (idwResult && idwPdfRef.current) {
        const idwNode = idwPdfRef.current;
        const idwCanvas = await html2canvas(idwNode, {
          backgroundColor: theme.pageBg,
          scale: 2.2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          windowWidth: PAGE_W,
          windowHeight: PAGE_H,
          // Override scroll offsets so html2canvas finds the off-screen element
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          x: 0,
          y: 0,
          width: PAGE_W,
          height: idwNode.scrollHeight || PAGE_H,
        });
        pdf.addPage();
        // Fill entire page with dark background so no white gap appears
        pdf.setFillColor(3, 7, 15); // theme.pageBg #03070f
        pdf.rect(0, 0, pdfW, pdfH, "F");
        const idwImg = idwCanvas.toDataURL("image/png");
        // Scale proportionally, anchored to top-left
        const idwRatio = idwCanvas.height / idwCanvas.width;
        const idwH = Math.min(pdfW * idwRatio, pdfH);
        pdf.addImage(idwImg, "PNG", 0, 0, pdfW, idwH, undefined, "FAST");
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

      pdf.save(fileName);
    } catch (err) {
      setError(`PDF generation failed: ${err.message || err}`);
    } finally {
      setPdfLoading(false);
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

              <SlideDownloadButton onDownload={downloadPDF} loading={pdfLoading} />
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
                  <HailMapPage data={normalized} nexradHits={nexradHits} preview />
                </div>
              </div>
            </div>

            {/* IDW Storm Interpolation Panel — only shows when Date of Loss is set */}
            {idwResult && (
              <div style={{ marginTop: 20 }}>
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
                  dateOfLoss={dateOfLoss}
                  propertyAddress={normalized.location.address}
                  mcds={normalized?.mcds || []}
                />
                <DolNexradMap
                  data={normalized}
                  nexradHits={nexradHits}
                  dateOfLoss={dateOfLoss}
                />
              </div>
            )}

            {/* Date of Loss set but not enough stations returned */}
            {dateOfLoss && !idwResult && normalized && (
              <div
                style={{
                  marginTop: 20,
                  background: "#050b14",
                  border: "1px solid #17325f",
                  borderRadius: 10,
                  padding: "14px 18px",
                  color: "#4d6797",
                  fontSize: 12,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                ◇ IDW interpolation requires ≥ 2 nearby stations for {dateOfLoss}. No station data was returned for this date.
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
                ref={(el) => {
                  hailRowMeasureRefs.current[i] = el;
                }}
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
              <div ref={mapPageRef} style={{ width:PAGE_W, height:PAGE_H }}>
                <HailMapPage data={normalized} nexradHits={nexradHits} />
              </div>
            )}
            {/* Hidden DOL Map PDF page */}
            {idwResult && dateOfLoss && (
              <div ref={dolMapPdfRef} style={{ width:PAGE_W, background:theme.pageBg, padding:"28px 22px", boxSizing:"border-box" }}>
                <div style={{ color:theme.muted2, fontSize:9, letterSpacing:"0.15em", fontFamily:'"IBM Plex Mono", monospace', textTransform:"uppercase", marginBottom:12 }}>
                  NEXRAD Recent Hail History · Date of Loss Analysis
                </div>
                <DolNexradMap data={normalized} nexradHits={nexradHits} dateOfLoss={dateOfLoss} />
              </div>
            )}
            {/* Hidden IDW PDF page — captured by html2canvas via idwPdfRef */}
            {idwResult && (
              <div
                ref={idwPdfRef}
                style={{
                  width: PAGE_W,
                  background: theme.pageBg,
                  color: theme.text,
                  fontFamily: "Inter, Arial, sans-serif",
                  padding: "32px 28px",
                  boxSizing: "border-box",
                }}
              >
                {/* PDF header on IDW page */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${theme.borderSoft}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src="/swi-logo.png" alt="SWI" style={{ height: 40, width: "auto", objectFit: "contain" }} />
                    <div>
                      <div style={{ color: theme.white, fontWeight: 800, fontSize: 14, letterSpacing: 0.4 }}>SEVERE WEATHER INTELLIGENCE</div>
                      <div style={{ color: theme.muted2, fontSize: 8, letterSpacing: 2.5, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", marginTop: 3 }}>Date-of-Loss Storm Interpolation Report</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", color: theme.muted2, fontSize: 8, letterSpacing: 1.2, fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.6 }}>
                    <div>IDW INTERPOLATION ENGINE v1.0.0</div>
                    <div>NOAA NWS · NCEI STORM EVENTS</div>
                  </div>
                </div>
                <IDWPanel
                  idwResult={idwResult}
                  dateOfLoss={dateOfLoss}
                  propertyAddress={normalized.location.address}
                  mcds={normalized?.mcds || []}
                />
                {/* Footer */}
                <div style={{ textAlign: "center", marginTop: 32, paddingTop: 16, borderTop: `1px solid ${theme.borderSoft}` }}>
                  <div style={{ color: theme.white, fontSize: 12 }}>©2026 Trinity Engineering, PLLC · All Rights Reserved</div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
