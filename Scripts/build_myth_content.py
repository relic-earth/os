"""
MYTH content builder - run inside Unreal Editor (headless commandlet):

  UnrealEditor-Cmd Myth.uproject -run=pythonscript -script=Scripts/build_myth_content.py

Creates /Game/Myth/Materials/* (master materials used by UMythAssetSubsystem),
the MPC_MythWorld weather/time parameter collection and Nanite-enabled copies of the
engine basic shapes in /Game/Myth/Meshes. Safe to re-run: existing assets are rebuilt.

Every material is procedural (world-space HLSL in Custom nodes) so MYTH has no
texture dependencies yet; each master is designed to be swapped for photo-scanned
material layers later without touching gameplay code (same parameter names).
"""
import unreal

MAT_DIR = "/Game/Myth/Materials"
MESH_DIR = "/Game/Myth/Meshes"
MEL = unreal.MaterialEditingLibrary
EAL = unreal.EditorAssetLibrary
tools = unreal.AssetToolsHelpers.get_asset_tools()

def log(msg):
    unreal.log("[MYTH content] " + msg)

# ------------------------------------------------------------------ helpers

def ensure_dir(path):
    if not EAL.does_directory_exist(path):
        EAL.make_directory(path)

def new_material(name):
    path = MAT_DIR + "/" + name
    if EAL.does_asset_exist(path):
        mat = EAL.load_asset(path)
        MEL.delete_all_material_expressions(mat)
    else:
        mat = tools.create_asset(name, MAT_DIR, unreal.Material, unreal.MaterialFactoryNew())
    mat.set_editor_property("used_with_instanced_static_meshes", True)
    try:
        mat.set_editor_property("used_with_nanite", True)
    except Exception:
        pass
    return mat

def set_prop(obj, name, value):
    try:
        obj.set_editor_property(name, value)
        return True
    except Exception as e:
        log("could not set %s on %s: %s" % (name, obj.get_name(), e))
        return False

def build_mpc():
    path = MAT_DIR + "/MPC_MythWorld"
    if EAL.does_asset_exist(path):
        mpc = EAL.load_asset(path)
    else:
        mpc = tools.create_asset("MPC_MythWorld", MAT_DIR, unreal.MaterialParameterCollection, unreal.MaterialParameterCollectionFactoryNew())
    names = ["Wetness", "Rain", "RainWorld", "Night", "Stars", "Lightning", "Blackout"]
    existing = [str(p.get_editor_property("parameter_name")) for p in mpc.get_editor_property("scalar_parameters")]
    if existing != names:
        params = []
        for n in names:
            p = unreal.CollectionScalarParameter()
            p.set_editor_property("parameter_name", n)
            p.set_editor_property("default_value", 1.0 if n in ("Night", "Stars") else 0.0)
            params.append(p)
        mpc.set_editor_property("scalar_parameters", params)
    EAL.save_loaded_asset(mpc)
    return mpc

class Graph(object):
    """Creates the shared inputs once per material and wires Custom HLSL nodes."""
    INPUTS = ["WP", "N", "CD0", "CD1", "CD2", "CD3", "T", "Wet", "Rain", "Night", "Lightning", "Blackout", "Stars",
              "CA", "CB", "PA", "PB", "EM", "N1", "N2", "CAM"]

    def __init__(self, mat, mpc, noise1=0.0022, noise2=0.035):
        self.mat = mat
        self.y = 0
        self.src = {}
        c = lambda cls, x, y: MEL.create_material_expression(mat, cls, x, y)
        self.src["WP"] = c(unreal.MaterialExpressionWorldPosition, -1600, 0)
        self.src["N"] = c(unreal.MaterialExpressionVertexNormalWS, -1600, 100)
        self.src["CAM"] = c(unreal.MaterialExpressionCameraPositionWS, -1600, 200)
        self.src["T"] = c(unreal.MaterialExpressionTime, -1600, 300)
        for i in range(4):
            e = c(unreal.MaterialExpressionPerInstanceCustomData, -1600, 400 + i * 80)
            set_prop(e, "data_index", i)
            set_prop(e, "const_default_value", 1.0 if i < 3 else 0.0)
            self.src["CD%d" % i] = e
        for j, (key, pname) in enumerate([("Wet", "Wetness"), ("Rain", "RainWorld"), ("Night", "Night"), ("Lightning", "Lightning"),
                                           ("Blackout", "Blackout"), ("Stars", "Stars")]):
            e = c(unreal.MaterialExpressionCollectionParameter, -1600, 800 + j * 80)
            set_prop(e, "collection", mpc)
            set_prop(e, "parameter_name", pname)
            self.src[key] = e
        defaults = {"CA": unreal.LinearColor(0.5, 0.5, 0.5, 1), "CB": unreal.LinearColor(0.2, 0.2, 0.2, 1),
                    "PA": unreal.LinearColor(0.6, 0, 0, 0), "PB": unreal.LinearColor(100, 0, 0.3, 0), "EM": unreal.LinearColor(0, 0, 0, 1)}
        pnames = {"CA": "ColorA", "CB": "ColorB", "PA": "ParamsA", "PB": "ParamsB", "EM": "EmissiveColor"}
        for k, (key, val) in enumerate(defaults.items()):
            e = c(unreal.MaterialExpressionVectorParameter, -1600, 1300 + k * 120)
            set_prop(e, "parameter_name", pnames[key])
            set_prop(e, "default_value", val)
            self.src[key] = e
        for key, scale, y in (("N1", noise1, 1950), ("N2", noise2, 2100)):
            e = c(unreal.MaterialExpressionNoise, -1600, y)
            set_prop(e, "scale", scale)
            set_prop(e, "quality", 1)
            set_prop(e, "levels", 3)
            set_prop(e, "output_min", 0.0)
            set_prop(e, "output_max", 1.0)
            try:
                e.set_editor_property("noise_function", unreal.NoiseFunction.NOISEFUNCTION_GRADIENT_TEX)
            except Exception:
                pass
            self.src[key] = e

    def custom(self, name, code, out_type, prop=None):
        node = MEL.create_material_expression(self.mat, unreal.MaterialExpressionCustom, -600, self.y)
        self.y += 220
        node.set_editor_property("code", code)
        node.set_editor_property("description", name)
        node.set_editor_property("output_type", out_type)
        inputs = []
        for n in self.INPUTS:
            ci = unreal.CustomInput()
            ci.set_editor_property("input_name", n)
            inputs.append(ci)
        node.set_editor_property("inputs", inputs)
        for n in self.INPUTS:
            if not MEL.connect_material_expressions(self.src[n], "", node, n):
                unreal.log_error("[MYTH content] %s: could not connect input %s in %s" % (self.mat.get_name(), n, name))
        if prop is not None:
            MEL.connect_material_property(node, "", prop)
        return node

F1 = unreal.CustomMaterialOutputType.CMOT_FLOAT1
F3 = unreal.CustomMaterialOutputType.CMOT_FLOAT3
P = unreal.MaterialProperty

def finish(mat):
    MEL.recompile_material(mat)
    EAL.save_loaded_asset(mat)
    log("built " + mat.get_name())

# ------------------------------------------------------------------ HLSL

UV = """
float3 nrm = normalize(N);
float3 an = abs(nrm);
float2 uv = an.z > 0.6 ? WP.xy : (an.x > an.y ? WP.yz : WP.xz);
"""

SURFACE_BASE = UV + """
float pat = PA.z;
float sc = max(PB.x, 1.0);
float3 c = CA.rgb * float3(CD0, CD1, CD2);
float mortar = 0.0;
if (pat > 0.5 && pat < 1.5) {
    float2 bb = uv / (float2(23.0, 7.5) * sc / 100.0);
    bb.x += floor(bb.y) * 0.5;
    float2 f = frac(bb);
    float hb = frac(sin(dot(floor(bb), float2(127.1, 311.7))) * 43758.5453);
    mortar = (f.x < 0.045 || f.y < 0.12) ? 1.0 : 0.0;
    c = lerp(c * (0.72 + 0.56 * hb), CB.rgb, mortar);
} else if (pat > 1.5 && pat < 2.5) {
    float2 f = frac(uv / sc);
    float hb = frac(sin(dot(floor(uv / sc), float2(12.9898, 78.233))) * 43758.5453);
    mortar = (f.x < 0.03 || f.y < 0.03) ? 1.0 : 0.0;
    c = lerp(c * (0.92 + 0.16 * hb), CB.rgb, mortar);
} else if (pat > 2.5 && pat < 3.5) {
    float2 bb = uv / float2(sc * 2.0, sc);
    bb.x += floor(bb.y) * 0.5;
    float2 f = frac(bb);
    float hb = frac(sin(dot(floor(bb), float2(12.9898, 78.233))) * 43758.5453);
    mortar = (f.x < 0.02 || f.y < 0.04) ? 1.0 : 0.0;
    c = c * (0.78 + 0.4 * hb) * lerp(1.0, 0.5, mortar);
} else if (pat > 3.5 && pat < 4.5) {
    float2 bb = uv / float2(sc * 12.0, sc);
    bb.x += frac(sin(floor(bb.y) * 91.3) * 437.5);
    float2 f = frac(bb);
    float hb = frac(sin(dot(floor(bb), float2(12.9898, 78.233))) * 43758.5453);
    float grain = sin(uv.y / sc * 20.0 + sin(uv.x * 0.05 + floor(bb.y)) * 2.0) * 0.5 + 0.5;
    mortar = (f.y < 0.03 || f.x < 0.004) ? 1.0 : 0.0;
    c = c * (0.75 + 0.4 * hb) * (0.88 + 0.24 * grain) * lerp(1.0, 0.4, mortar);
} else if (pat > 4.5 && pat < 5.5) {
    c = lerp(CA.rgb, CB.rgb, N1) * (0.65 + 0.7 * N2) * float3(CD0, CD1, CD2);
} else if (pat > 5.5 && pat < 6.5) {
    float2 f = frac(uv / sc);
    mortar = (f.x < 0.004 || f.y < 0.004) ? 1.0 : 0.0;
    c = c * (0.82 + 0.36 * N2) * lerp(1.0, 0.6, mortar);
} else if (pat > 6.5 && pat < 7.5) {
    c = c * (0.9 + 0.1 * sin(uv.x * 6.0) * sin(uv.y * 6.0));
} else if (pat > 7.5 && pat < 8.5) {
    float vein = abs(sin((uv.x + uv.y * 0.6) / sc * 6.0 + N1 * 8.0 + N2 * 2.0));
    c = lerp(c, CB.rgb, pow(1.0 - vein, 12.0));
} else if (pat > 8.5) {
    c = c * (0.95 + 0.05 * sin(uv.x * 3.0 + N2 * 10.0));
}
float grime = lerp(1.0 - PB.z * 0.5, 1.0 + PB.z * 0.3, N1);
c *= grime;
float up = saturate(nrm.z * 0.5 + 0.5);
float wet = Wet * lerp(0.35, 1.0, up);
c *= lerp(1.0, 0.55, wet * (1.0 - PA.y));
return max(c, 0.0);
"""

SURFACE_ROUGH = """
float3 nrm = normalize(N);
float up = saturate(nrm.z);
float r = PA.x * lerp(0.9, 1.15, N2);
float wet = Wet * lerp(0.3, 1.0, up);
float puddle = saturate((N1 - 0.58) * 6.0) * up * Wet;
r = lerp(r, 0.14, wet * 0.7);
r = lerp(r, 0.03, puddle);
return saturate(r);
"""

RIPPLES = """
float2 rg = WP.xy / 38.0;
float2 rid = floor(rg);
float2 rf = frac(rg) - 0.5;
float rh = frac(sin(dot(rid, float2(127.1, 311.7))) * 43758.5453);
float rph = frac(T * 1.1 + rh);
float rr = length(rf);
float wave = sin((rr - rph * 0.5) * 70.0) * (1.0 - rph) * saturate(1.0 - abs(rr - rph * 0.5) * 12.0);
float2 rdir = rr > 0.0001 ? rf / rr : float2(0.0, 0.0);
"""

SURFACE_NORMAL = """
float3 nrm = normalize(N);
float up = saturate(nrm.z);
""" + RIPPLES + """
float puddle = saturate((N1 - 0.58) * 6.0) * up * Wet;
float2 rip = rdir * wave * 0.3 * Rain * saturate(puddle * 1.5 + Wet * 0.25) * up;
float2 micro = (float2(N2, frac(N2 * 7.31)) - 0.5) * 0.07 * (1.0 - Wet * 0.8);
return normalize(nrm + float3(micro + rip, 0.0));
"""

ROAD_BASE = """
float grit = frac(sin(dot(floor(WP.xy / 2.0), float2(12.9898, 78.233))) * 43758.5453);
float3 c = CA.rgb * lerp(0.75, 1.3, N2) * lerp(0.85, 1.15, grit) * lerp(0.85, 1.15, N1);
float track = 0.5 + 0.5 * sin(WP.x * 0.0142) * sin(WP.y * 0.0142);
c *= lerp(1.0, 0.8, track * 0.4);
float pud = saturate((N1 - (0.64 - Wet * 0.1)) * 7.0) * Wet;
c *= lerp(1.0, 0.5, Wet);
c = lerp(c, c * 0.4, pud);
return c;
"""

ROAD_ROUGH = """
float pud = saturate((N1 - (0.64 - Wet * 0.1)) * 7.0) * Wet;
float grit = frac(sin(dot(floor(WP.xy / 2.0), float2(12.9898, 78.233))) * 43758.5453);
float r = lerp(PA.x, 0.28, Wet) * lerp(0.85, 1.1, grit);
return saturate(lerp(r, 0.02, pud));
"""

ROAD_NORMAL = RIPPLES + """
float pud = saturate((N1 - (0.64 - Wet * 0.1)) * 7.0) * Wet;
float2 rip = rdir * wave * 0.4 * Rain * saturate(pud * 1.5 + Wet * 0.3);
float2 micro = (float2(N2, frac(N2 * 7.3)) - 0.5) * 0.08 * (1.0 - pud);
return normalize(float3(rip + micro, 1.0));
"""

FACADE_PRE = """
float3 nrm = normalize(N);
float3 an = abs(nrm);
float horiz = an.z > 0.7 ? 1.0 : 0.0;
float u = an.x > an.y ? WP.y : WP.x;
float v = WP.z;
float style = PA.z;
float fh = max(PB.x, 200.0);
float bay = style < 0.5 ? 150.0 : (style < 1.5 ? 280.0 : (style < 2.5 ? 220.0 : 300.0));
float wx = style < 0.5 ? 0.9 : (style < 1.5 ? 0.55 : (style < 2.5 ? 0.45 : 0.8));
float wy = style < 0.5 ? 0.72 : (style < 1.5 ? 0.6 : (style < 2.5 ? 0.55 : 0.66));
float cu = u / bay;
float cv = v / fh;
float2 cid = float2(floor(cu), floor(cv));
float2 cf = float2(frac(cu), frac(cv));
float inx = step(abs(cf.x - 0.5), wx * 0.5);
float iny = step(abs(cf.y - 0.55), wy * 0.5);
float win = inx * iny * (1.0 - horiz) * step(1.0, cid.y);
float seed = CD3 * 91.7 + (an.x > an.y ? 17.0 : 3.0);
float h1 = frac(sin(dot(cid + seed, float2(127.1, 311.7))) * 43758.5453);
float h2 = frac(sin(dot(cid + seed, float2(269.5, 183.3))) * 43758.5453);
float h3 = frac(sin(dot(floor(cid / float2(3.0, 1.0)) + seed, float2(419.2, 371.9))) * 43758.5453);
float litp = PB.z * lerp(0.12, 1.0, Night) * (1.0 - Blackout);
float lit = win * step(h1, litp);
"""

FACADE_BASE = FACADE_PRE + """
float3 wall = CA.rgb * float3(CD0, CD1, CD2) * lerp(0.85, 1.12, N1);
float spandrel = style < 0.5 ? (1.0 - iny) * (1.0 - horiz) : 0.0;
wall = lerp(wall, CB.rgb * 1.6, spandrel * 0.6);
wall *= lerp(1.0, 0.6, Wet * 0.8);
float3 glass = CB.rgb * lerp(0.7, 1.3, h2);
return lerp(wall, glass, win);
"""

FACADE_EMISSIVE = FACADE_PRE + """
float3 warm = EM.rgb;
float3 cool = float3(0.75, 0.85, 1.0);
float3 tv = float3(0.35, 0.5, 1.0);
float3 col = h2 > 0.85 ? cool : (h2 < 0.08 ? tv : warm);
float gy = saturate((cf.y - 0.55 + wy * 0.5) / max(wy, 0.01));
float grad = lerp(0.55, 1.25, gy);
float bright = PB.y * (0.35 + 1.1 * h3) * grad;
float topy = 0.55 + wy * 0.5;
float blind = step(0.7, h3) * step(topy - wy * 0.45 * frac(h1 * 7.0), cf.y);
float flick = h2 < 0.08 ? (0.7 + 0.3 * sin(T * 3.0 + h1 * 40.0)) : 1.0;
return col * bright * lit * (1.0 - blind * 0.7) * flick;
"""

FACADE_ROUGH = FACADE_PRE + """
return lerp(lerp(0.75, 0.4, Wet), 0.04, win);
"""

FACADE_METAL = FACADE_PRE + """
return win * (style < 0.5 ? 0.35 : 0.0);
"""

GLASS_STREAK = """
float3 nrm = normalize(N);
float3 an = abs(nrm);
float u = an.x > an.y ? WP.y : WP.x;
float colm = floor(u / 2.5);
float hs = frac(sin(colm * 91.345 + CD3 * 13.0) * 43758.5453);
float streak = step(0.82, hs) * smoothstep(0.0, 0.3, frac(WP.z / 60.0 + T * (0.25 + hs * 0.5))) * (1.0 - an.z);
float2 dg = floor(float2(u, WP.z) / 3.0);
float drop = step(0.93, frac(sin(dot(dg, float2(12.9898, 78.233))) * 43758.5453));
float wetv = Rain * (1.0 - an.z * 0.5);
float rain = saturate((streak * 0.8 + drop * 0.6) * wetv);
"""

GLASS_ROUGH = GLASS_STREAK + "return saturate(lerp(PA.x, 0.35, rain));"
GLASS_OPACITY = GLASS_STREAK + "return saturate(PA.z + rain * 0.25);"

CARPAINT_DROPS = """
float3 nrm = normalize(N);
float up = saturate(nrm.z);
float2 g = WP.xy / 1.6;
float hd = frac(sin(dot(floor(g), float2(12.9898, 78.233))) * 43758.5453);
float2 fd = frac(g) - 0.5;
float drop = step(length(fd), 0.18 + hd * 0.15) * step(0.55, hd) * Wet * up;
"""

EMISSIVE = UV + """
float pat = PA.z;
float k = 1.0;
float3 tint = float3(CD0, CD1, CD2);
if (pat > 0.5 && pat < 1.5) {
    float bars = 0.5 + 0.5 * sin(uv.y * 0.05 + T * 2.0);
    float scan = 0.85 + 0.15 * sin(uv.y * 1.2);
    float blocks = step(0.5, frac(sin(dot(floor(uv / 40.0) + floor(T * 0.5), float2(12.9898, 78.233))) * 43758.5453));
    float3 hue = 0.5 + 0.5 * cos(6.2831 * (T * 0.05 + uv.x * 0.002 + float3(0.0, 0.33, 0.67)));
    return CA.rgb * hue * lerp(0.4, 1.0, bars) * scan * lerp(0.6, 1.0, blocks) * PB.y * tint * (1.0 - Blackout);
}
if (pat > 1.5 && pat < 2.5) k = 0.8 + 0.2 * step(0.3, frac(sin(floor(T * 14.0) + CD3 * 50.0) * 43758.5453));
if (pat > 2.5 && pat < 3.5) k = 0.75 + 0.25 * sin(T * 1.4 + CD3 * 6.28);
if (pat > 3.5) k = step(0.55, frac(T * 0.8 + CD3));
float nightk = PB.z > 0.5 ? saturate(Night * 1.5 - 0.3) : lerp(0.5, 1.0, Night);
float grid = PA.x > 0.5 ? (1.0 - Blackout * 0.95) : 1.0;
return CA.rgb * PB.y * k * nightk * grid * tint;
"""

FOLIAGE_BASE = """
return lerp(CA.rgb, CB.rgb, N2) * float3(CD0, CD1, CD2) * lerp(0.5, 1.35, N1) * lerp(1.0, 0.8, Wet);
"""
FOLIAGE_NORMAL = """
float3 nrm = normalize(N);
return normalize(nrm + (float3(N2, frac(N2 * 13.7), frac(N1 * 7.1)) - 0.5) * 1.3);
"""

WATER_NORMAL = RIPPLES + """
float2 w1 = float2(sin(WP.x * 0.02 + T * 0.8), cos(WP.y * 0.025 + T * 0.6)) * 0.05;
float2 rip = rdir * wave * 0.5 * Rain;
return normalize(float3(w1 + rip, 1.0));
"""

RAIN_WPO = """
float ph = frac(T * 0.42 + CD0);
return float3(ph * 2400.0 * 0.06, 0.0, -ph * 2400.0);
"""
RAIN_EMISSIVE = """
float ph = frac(T * 0.42 + CD0);
float fade = sin(ph * 3.14159);
return CA.rgb * 0.06 * Rain * fade * (1.0 + Lightning * 8.0);
"""

SKY = """
float3 d = normalize(WP - CAM);
float upz = d.z;
float hz = pow(saturate(1.0 - abs(upz)), 5.0);
float3 glow = CB.rgb * hz * (0.6 + Night * 0.8) * (1.0 + Rain * 1.5);
float3 zen = CA.rgb * saturate(upz) * Night;
float3 cell = floor(d * 380.0);
float hsky = frac(sin(dot(cell, float3(12.9898, 78.233, 37.719))) * 43758.5453);
float star = step(0.9975, hsky) * saturate(upz * 3.0) * Stars * Night;
float tw = 0.6 + 0.4 * sin(T * (2.0 + hsky * 5.0) + hsky * 100.0);
float3 flash = float3(0.6, 0.65, 0.8) * Lightning * 0.4 * saturate(upz + 0.3);
return glow + zen + star * tw * 4.0 * (1.0 - Rain) + flash;
"""

# ------------------------------------------------------------------ masters

def build_surface(mpc):
    m = new_material("M_Myth_Surface")
    set_prop(m, "tangent_space_normal", False)
    g = Graph(m, mpc)
    g.custom("BaseColor", SURFACE_BASE, F3, P.MP_BASE_COLOR)
    g.custom("Roughness", SURFACE_ROUGH, F1, P.MP_ROUGHNESS)
    g.custom("Metallic", "return PA.y;", F1, P.MP_METALLIC)
    g.custom("Normal", SURFACE_NORMAL, F3, P.MP_NORMAL)
    g.custom("Emissive", "return EM.rgb * PB.y;", F3, P.MP_EMISSIVE_COLOR)
    finish(m)

def build_road(mpc):
    m = new_material("M_Myth_Road")
    set_prop(m, "tangent_space_normal", False)
    g = Graph(m, mpc, 0.0016, 0.02)
    g.custom("BaseColor", ROAD_BASE, F3, P.MP_BASE_COLOR)
    g.custom("Roughness", ROAD_ROUGH, F1, P.MP_ROUGHNESS)
    g.custom("Normal", ROAD_NORMAL, F3, P.MP_NORMAL)
    finish(m)

def build_facade(mpc):
    m = new_material("M_Myth_Facade")
    g = Graph(m, mpc, 0.003, 0.02)
    g.custom("BaseColor", FACADE_BASE, F3, P.MP_BASE_COLOR)
    g.custom("Emissive", FACADE_EMISSIVE, F3, P.MP_EMISSIVE_COLOR)
    g.custom("Roughness", FACADE_ROUGH, F1, P.MP_ROUGHNESS)
    g.custom("Metallic", FACADE_METAL, F1, P.MP_METALLIC)
    finish(m)

def build_glass(mpc):
    m = new_material("M_Myth_Glass")
    g = Graph(m, mpc)
    g.custom("BaseColor", "return CA.rgb;", F3, P.MP_BASE_COLOR)
    g.custom("Roughness", GLASS_ROUGH, F1, P.MP_ROUGHNESS)
    g.custom("Metallic", "return PA.y;", F1, P.MP_METALLIC)
    finish(m)

def build_glass_clear(mpc):
    m = new_material("M_Myth_GlassClear")
    set_prop(m, "blend_mode", unreal.BlendMode.BLEND_TRANSLUCENT)
    set_prop(m, "two_sided", True)
    set_prop(m, "translucency_lighting_mode", unreal.TranslucencyLightingMode.TLM_SURFACE)
    g = Graph(m, mpc)
    g.custom("BaseColor", "return CA.rgb;", F3, P.MP_BASE_COLOR)
    g.custom("Roughness", GLASS_ROUGH, F1, P.MP_ROUGHNESS)
    g.custom("Opacity", GLASS_OPACITY, F1, P.MP_OPACITY)
    g.custom("Specular", "return 1.0;", F1, P.MP_SPECULAR)
    finish(m)

def build_carpaint(mpc):
    m = new_material("M_Myth_CarPaint")
    set_prop(m, "shading_model", unreal.MaterialShadingModel.MSM_CLEAR_COAT)
    set_prop(m, "tangent_space_normal", False)
    g = Graph(m, mpc)
    g.custom("BaseColor", "return CA.rgb * float3(CD0, CD1, CD2) * lerp(1.0, 0.85, Wet);", F3, P.MP_BASE_COLOR)
    g.custom("Metallic", "return PA.y;", F1, P.MP_METALLIC)
    g.custom("Roughness", CARPAINT_DROPS + "return saturate(lerp(PA.x, 0.08, drop));", F1, P.MP_ROUGHNESS)
    # clear coat inputs are named differently across engine versions
    cc = next((getattr(P, n) for n in ("MP_CUSTOM_DATA0", "MP_CUSTOMDATA0", "MP_CLEAR_COAT") if hasattr(P, n)), None)
    ccr = next((getattr(P, n) for n in ("MP_CUSTOM_DATA1", "MP_CUSTOMDATA1", "MP_CLEAR_COAT_ROUGHNESS") if hasattr(P, n)), None)
    if cc is not None and ccr is not None:
        g.custom("ClearCoat", "return 1.0;", F1, cc)
        g.custom("ClearCoatRoughness", CARPAINT_DROPS + "return lerp(0.035, 0.25, drop);", F1, ccr)
    else:
        log("clear coat inputs not exposed to Python here; car paint uses default lit")
        set_prop(m, "shading_model", unreal.MaterialShadingModel.MSM_DEFAULT_LIT)
    g.custom("Normal", CARPAINT_DROPS + "return normalize(nrm + float3(fd * drop * 1.5, 0.0));", F3, P.MP_NORMAL)
    finish(m)

def build_emissive(mpc):
    m = new_material("M_Myth_Emissive")
    set_prop(m, "shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    g = Graph(m, mpc)
    g.custom("Emissive", EMISSIVE, F3, P.MP_EMISSIVE_COLOR)
    finish(m)

def build_foliage(mpc):
    m = new_material("M_Myth_Foliage")
    set_prop(m, "tangent_space_normal", False)
    g = Graph(m, mpc, 0.012, 0.06)
    g.custom("BaseColor", FOLIAGE_BASE, F3, P.MP_BASE_COLOR)
    g.custom("Normal", FOLIAGE_NORMAL, F3, P.MP_NORMAL)
    g.custom("Roughness", "return lerp(PA.x, 0.3, Wet);", F1, P.MP_ROUGHNESS)
    finish(m)

def build_water(mpc):
    m = new_material("M_Myth_Water")
    set_prop(m, "tangent_space_normal", False)
    g = Graph(m, mpc)
    g.custom("BaseColor", "return CA.rgb;", F3, P.MP_BASE_COLOR)
    g.custom("Roughness", "return 0.025;", F1, P.MP_ROUGHNESS)
    g.custom("Normal", WATER_NORMAL, F3, P.MP_NORMAL)
    finish(m)

def build_rain(mpc):
    m = new_material("M_Myth_Rain")
    set_prop(m, "shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    set_prop(m, "blend_mode", unreal.BlendMode.BLEND_ADDITIVE)
    set_prop(m, "two_sided", True)
    g = Graph(m, mpc)
    g.custom("Emissive", RAIN_EMISSIVE, F3, P.MP_EMISSIVE_COLOR)
    g.custom("WPO", RAIN_WPO, F3, P.MP_WORLD_POSITION_OFFSET)
    finish(m)

def build_sky(mpc):
    m = new_material("M_Myth_Sky")
    set_prop(m, "shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
    set_prop(m, "blend_mode", unreal.BlendMode.BLEND_ADDITIVE)
    set_prop(m, "two_sided", True)
    set_prop(m, "use_translucency_vertex_fog", False)
    g = Graph(m, mpc)
    g.custom("Sky", SKY, F3, P.MP_EMISSIVE_COLOR)
    finish(m)

def build_text():
    """Glowing variant of the engine text material for TextRender signage."""
    src = "/Engine/EngineMaterials/DefaultTextMaterialOpaque"
    dst = MAT_DIR + "/M_Myth_Text"
    try:
        if EAL.does_asset_exist(dst):
            EAL.delete_asset(dst)
        mat = EAL.duplicate_asset(src, dst)
        if mat is None:
            log("text material: engine source not found, using default")
            return
        node = None
        for prop in (P.MP_EMISSIVE_COLOR, P.MP_BASE_COLOR):
            try:
                node = MEL.get_material_property_input_node(mat, prop)
            except Exception:
                node = None
            if node is not None:
                break
        if node is None:
            log("text material: no colour input found, leaving as-is")
            EAL.save_loaded_asset(mat)
            return
        mul = MEL.create_material_expression(mat, unreal.MaterialExpressionMultiply, -300, 0)
        set_prop(mul, "const_b", 6.0)
        MEL.connect_material_expressions(node, "", mul, "A")
        MEL.connect_material_property(mul, "", P.MP_EMISSIVE_COLOR)
        set_prop(mat, "shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
        finish(mat)
    except Exception as e:
        log("text material skipped: %s" % e)

def build_nanite_meshes():
    ensure_dir(MESH_DIR)
    for src, name in (("/Engine/BasicShapes/Cube", "SM_MythCube"), ("/Engine/BasicShapes/Cylinder", "SM_MythCylinder"),
                      ("/Engine/BasicShapes/Sphere", "SM_MythSphere"), ("/Engine/BasicShapes/Plane", "SM_MythPlane")):
        dst = MESH_DIR + "/" + name
        if not EAL.does_asset_exist(dst):
            EAL.duplicate_asset(src, dst)
        mesh = EAL.load_asset(dst)
        try:
            ns = mesh.get_editor_property("nanite_settings")
            ns.set_editor_property("enabled", True)
            mesh.set_editor_property("nanite_settings", ns)
        except Exception as e:
            log("nanite not enabled on %s: %s" % (name, e))
        EAL.save_loaded_asset(mesh)
        log("mesh " + name)

def main():
    ensure_dir(MAT_DIR)
    mpc = build_mpc()
    for fn in (build_surface, build_road, build_facade, build_glass, build_glass_clear, build_carpaint,
               build_emissive, build_foliage, build_water, build_rain, build_sky):
        try:
            fn(mpc)
        except Exception as e:
            unreal.log_error("[MYTH content] %s failed: %s" % (fn.__name__, e))
    build_text()
    build_nanite_meshes()
    log("done")

main()
