"use strict";

/*
=========================================================
NEON DRIFT
=========================================================

- Sabit hız
- Sürekli ileri hareket
- Serbest direksiyon
- Drift / süzülme
- 3D perspektif
- Gerçek yol dönüşleri
- Kamera yol ile birlikte döner
- Kare neon zemin
- Uçurum
- Düşünce yeniden başlangıç
- Engel yok
=========================================================
*/


const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


const distanceElement =
    document.getElementById("distance");

const fallsElement =
    document.getElementById("falls");

const startScreen =
    document.getElementById("startScreen");

const finishScreen =
    document.getElementById("finishScreen");

const startButton =
    document.getElementById("startButton");

const restartButton =
    document.getElementById("restartButton");

const finishDistance =
    document.getElementById("finishDistance");

const leftButton =
    document.getElementById("leftButton");

const rightButton =
    document.getElementById("rightButton");


/* =========================================================
   CANVAS
========================================================= */

let width = 0;
let height = 0;
let dpr = 1;


function resize() {

    dpr =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );

    width =
        window.innerWidth;

    height =
        window.innerHeight;

    canvas.width =
        Math.floor(width * dpr);

    canvas.height =
        Math.floor(height * dpr);

    canvas.style.width =
        width + "px";

    canvas.style.height =
        height + "px";

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );
}


window.addEventListener(
    "resize",
    resize
);

resize();


/* =========================================================
   SABİT OYUN HIZI
========================================================= */

/*
   ÖNEMLİ:

   Hız hiçbir zaman artmıyor.

   Oyunun başından sonuna kadar aynı
   ilerleme hızını kullanıyoruz.
*/

const FORWARD_SPEED = 420;


/* =========================================================
   YOL
========================================================= */

const ROAD_WIDTH = 420;

const SEGMENT_LENGTH = 80;

const ROAD_LENGTH = 14000;

const DRAW_DISTANCE = 3000;

const HORIZON_Y = 0.23;


const road = [];


/*
   Yol noktalarını oluştur.

   Birden fazla sinüs kullanarak
   düz olmayan doğal virajlar.
*/

for (
    let z = 0;
    z <= ROAD_LENGTH + SEGMENT_LENGTH;
    z += SEGMENT_LENGTH
) {

    const x =
        Math.sin(z * 0.00155) * 600 +

        Math.sin(z * 0.00052) * 420 +

        Math.sin(z * 0.0034) * 110;


    road.push({
        z,
        x
    });
}


/* =========================================================
   YOL MERKEZİ
========================================================= */

function roadCenter(z) {

    z =
        Math.max(
            0,
            Math.min(
                ROAD_LENGTH,
                z
            )
        );


    const index =
        Math.floor(
            z / SEGMENT_LENGTH
        );


    const next =
        Math.min(
            index + 1,
            road.length - 1
        );


    const a =
        road[index];

    const b =
        road[next];


    const local =
        (
            z - a.z
        ) /
        SEGMENT_LENGTH;


    /*
       Smoothstep.
    */

    const t =
        local *
        local *
        (3 - 2 * local);


    return (
        a.x +
        (b.x - a.x) * t
    );
}


/* =========================================================
   YOL EĞİMİ
========================================================= */

function roadSlope(z) {

    const before =
        roadCenter(
            z - 40
        );

    const after =
        roadCenter(
            z + 40
        );


    return (
        after - before
    ) / 80;
}


/* =========================================================
   OYUNCU
========================================================= */

const player = {

    z: 0,

    /*
       Yol merkezine göre yatay
       konum.
    */

    offsetX: 0,

    /*
       Gerçek yatay hız.

       Bu değer sayesinde
       araç aniden durmuyor.
    */

    lateralVelocity: 0,

    /*
       Görsel drift açısı.
    */

    driftAngle: 0,

    /*
       Görsel dönüş açısı.
    */

    visualRotation: 0,

    falling: false,

    fallTime: 0
};


/* =========================================================
   OYUN DURUMU
========================================================= */

let running = false;

let distance = 0;

let falls = 0;

let lastTime = 0;

let animationFrame = 0;


/* =========================================================
   KONTROLLER
========================================================= */

let leftPressed = false;

let rightPressed = false;


function setLeft(value) {
    leftPressed = value;
}


function setRight(value) {
    rightPressed = value;
}


/* =========================================================
   KLAVYE
========================================================= */

window.addEventListener(
    "keydown",
    function(event) {

        const key =
            event.key.toLowerCase();


        if (
            key === "a" ||
            key === "arrowleft"
        ) {

            event.preventDefault();

            setLeft(true);
        }


        if (
            key === "d" ||
            key === "arrowright"
        ) {

            event.preventDefault();

            setRight(true);
        }
    }
);


window.addEventListener(
    "keyup",
    function(event) {

        const key =
            event.key.toLowerCase();


        if (
            key === "a" ||
            key === "arrowleft"
        ) {

            setLeft(false);
        }


        if (
            key === "d" ||
            key === "arrowright"
        ) {

            setRight(false);
        }
    }
);


/* =========================================================
   MOBİL BUTONLAR
========================================================= */

leftButton.addEventListener(
    "pointerdown",
    function(event) {

        event.preventDefault();

        setLeft(true);
    }
);


leftButton.addEventListener(
    "pointerup",
    function() {

        setLeft(false);
    }
);


leftButton.addEventListener(
    "pointercancel",
    function() {

        setLeft(false);
    }
);


rightButton.addEventListener(
    "pointerdown",
    function(event) {

        event.preventDefault();

        setRight(true);
    }
);


rightButton.addEventListener(
    "pointerup",
    function() {

        setRight(false);
    }
);


rightButton.addEventListener(
    "pointercancel",
    function() {

        setRight(false);
    }
);


/* =========================================================
   SWIPE
========================================================= */

let touchStartX = 0;


canvas.addEventListener(
    "touchstart",
    function(event) {

        if (
            event.touches.length !== 1
        ) {
            return;
        }

        touchStartX =
            event.touches[0].clientX;
    },
    {
        passive: true
    }
);


canvas.addEventListener(
    "touchmove",
    function(event) {

        if (
            !running ||
            event.touches.length !== 1
        ) {
            return;
        }


        const currentX =
            event.touches[0].clientX;


        const difference =
            currentX -
            touchStartX;


        /*
           Parmağın hareketi doğrudan
           aracın konumuna değil,
           direksiyon kuvvetine dönüşüyor.
        */

        if (
            Math.abs(difference) > 3
        ) {

            player.lateralVelocity +=
                difference * 0.018;

            touchStartX =
                currentX;
        }

    },
    {
        passive: true
    }
);


/* =========================================================
   3D PROJEKSİYON
========================================================= */

/*
   Kameranın bulunduğu yol merkezi.
*/

function cameraCenter() {

    return roadCenter(
        player.z + 250
    );
}


/*
   Yol dönüşünün kamera açısı.
*/

function cameraAngle() {

    return Math.atan(
        roadSlope(
            player.z + 500
        ) *
        0.95
    );
}


/*
   Dünya koordinatını ekrana aktar.
*/

function project(z) {

    const relativeZ =
        z - player.z;


    if (
        relativeZ < 30 ||
        relativeZ > DRAW_DISTANCE
    ) {
        return null;
    }


    /*
       Perspektif.

       Yakındaki parçalar büyük,
       uzaktakiler küçük.
    */

    const depth =
        relativeZ /
        DRAW_DISTANCE;


    const perspective =
        1 /
        (
            0.18 +
            relativeZ * 0.00115
        );


    const horizon =
        height * HORIZON_Y;


    const y =
        horizon +
        (
            1 - depth
        ) *
        (
            height - horizon
        );


    const center =
        roadCenter(z);


    const cam =
        cameraCenter();


    /*
       Kamera dönüşünü hesapla.
    */

    const angle =
        cameraAngle();


    const dx =
        center - cam;


    /*
       Yol virajında ekranın da
       dönmesi.
    */

    const rotatedX =
        dx *
            Math.cos(angle)
        -
        relativeZ *
            Math.sin(angle) *
            0.28;


    const screenX =
        width / 2 +
        rotatedX *
        perspective;


    return {
        x: screenX,
        y,
        scale: perspective
    };
}


/* =========================================================
   ARKA PLAN
========================================================= */

function drawBackground() {

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            0,
            height
        );


    gradient.addColorStop(
        0,
        "#020006"
    );

    gradient.addColorStop(
        0.4,
        "#080019"
    );

    gradient.addColorStop(
        1,
        "#020006"
    );


    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /*
       Ufukta mor neon.
    */

    const glow =
        ctx.createRadialGradient(
            width / 2,
            height * 0.23,
            0,
            width / 2,
            height * 0.23,
            width * 0.7
        );


    glow.addColorStop(
        0,
        "rgba(130,0,255,0.38)"
    );

    glow.addColorStop(
        0.45,
        "rgba(30,0,100,0.14)"
    );

    glow.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );


    ctx.fillStyle =
        glow;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /*
       Yıldızlar.
    */

    for (
        let i = 0;
        i < 100;
        i++
    ) {

        const x =
            (
                i * 97
            ) %
            width;

        const y =
            (
                i * 53
            ) %
            (
                height * 0.55
            );


        ctx.globalAlpha =
            0.15 +
            (
                i % 5
            ) * 0.12;


        ctx.fillStyle =
            "#00eaff";


        ctx.fillRect(
            x,
            y,
            1.5,
            1.5
        );
    }


    ctx.globalAlpha = 1;
}


/* =========================================================
   3D KARE YOL
========================================================= */

function drawRoad() {

    const startZ =
        player.z + 50;


    const endZ =
        Math.min(
            player.z +
            DRAW_DISTANCE,
            ROAD_LENGTH
        );


    /*
       Segment segment çiziyoruz.
    */

    for (
        let z = endZ;
        z >= startZ;
        z -= SEGMENT_LENGTH
    ) {

        const p1 =
            project(z);


        const p2 =
            project(
                z +
                SEGMENT_LENGTH
            );


        if (
            !p1 ||
            !p2
        ) {
            continue;
        }


        const half1 =
            ROAD_WIDTH *
            p1.scale *
            0.5;


        const half2 =
            ROAD_WIDTH *
            p2.scale *
            0.5;


        const left1 =
            p1.x - half1;

        const right1 =
            p1.x + half1;


        const left2 =
            p2.x - half2;

        const right2 =
            p2.x + half2;


        /*
           Karanlık zemin.
        */

        ctx.fillStyle =
            "#080518";


        ctx.beginPath();

        ctx.moveTo(
            left1,
            p1.y
        );

        ctx.lineTo(
            right1,
            p1.y
        );

        ctx.lineTo(
            right2,
            p2.y
        );

        ctx.lineTo(
            left2,
            p2.y
        );

        ctx.closePath();

        ctx.fill();


        /*
           Kare renkleri.
        */

        const row =
            Math.floor(
                z /
                SEGMENT_LENGTH
            );


        const colors = [
            "#ff00d9",
            "#7200ff",
            "#005eff",
            "#00eaff",
            "#00ffc8",
            "#9d00ff"
        ];


        const color =
            colors[
                Math.abs(row) %
                colors.length
            ];


        /*
           Enine kare çizgisi.
        */

        ctx.save();

        ctx.strokeStyle =
            color;

        ctx.shadowBlur =
            12 *
            p1.scale;

        ctx.shadowColor =
            color;

        ctx.lineWidth =
            Math.max(
                1,
                3 *
                p1.scale
            );


        ctx.beginPath();

        ctx.moveTo(
            left1,
            p1.y
        );

        ctx.lineTo(
            right1,
            p1.y
        );

        ctx.stroke();


        ctx.restore();


        /*
           Boyuna kare çizgileri.
        */

        const gridLines = 10;


        for (
            let i = 1;
            i < gridLines;
            i++
        ) {

            const t =
                i /
                gridLines;


            const x1 =
                left1 +
                (
                    right1 -
                    left1
                ) *
                t;


            const x2 =
                left2 +
                (
                    right2 -
                    left2
                ) *
                t;


            ctx.strokeStyle =
                "rgba(170,0,255,0.75)";

            ctx.lineWidth =
                Math.max(
                    0.5,
                    1.7 *
                    p1.scale
                );


            ctx.beginPath();

            ctx.moveTo(
                x1,
                p1.y
            );

            ctx.lineTo(
                x2,
                p2.y
            );

            ctx.stroke();
        }


        /*
           Slalom şeklinde neon şerit.

           Bu şerit yol üzerinde sağa-sola
           kıvrılarak ilerliyor.
        */

        const wave1 =
            Math.sin(
                z * 0.005
            ) *
            ROAD_WIDTH *
            0.32;


        const wave2 =
            Math.sin(
                (
                    z +
                    SEGMENT_LENGTH
                ) *
                0.005
            ) *
            ROAD_WIDTH *
            0.32;


        const stripe1 =
            p1.x +
            wave1 *
            p1.scale;


        const stripe2 =
            p2.x +
            wave2 *
            p2.scale;


        ctx.save();

        ctx.strokeStyle =
            color;

        ctx.shadowBlur =
            18 *
            p1.scale;

        ctx.shadowColor =
            color;

        ctx.lineWidth =
            Math.max(
                2,
                7 *
                p1.scale
            );


        ctx.beginPath();

        ctx.moveTo(
            stripe1,
            p1.y
        );

        ctx.lineTo(
            stripe2,
            p2.y
        );

        ctx.stroke();

        ctx.restore();
    }
}


/* =========================================================
   UÇURUM KENARLARI
========================================================= */

function drawRoadEdges() {

    const start =
        player.z + 40;


    for (
        let z = start;
        z <
            player.z +
            DRAW_DISTANCE;
        z += 60
    ) {

        const p =
            project(z);


        if (!p) {
            continue;
        }


        const half =
            ROAD_WIDTH *
            p.scale *
            0.5;


        /*
           Sol neon kenar.
        */

        ctx.save();

        ctx.strokeStyle =
            "#00eaff";

        ctx.shadowBlur =
            14;

        ctx.shadowColor =
            "#00eaff";

        ctx.lineWidth =
            Math.max(
                1,
                5 *
                p.scale
            );


        ctx.beginPath();

        ctx.moveTo(
            p.x - half,
            p.y
        );

        ctx.lineTo(
            p.x -
            half -
            15 *
            p.scale,
            p.y +
            8 *
            p.scale
        );

        ctx.stroke();


        /*
           Sağ neon kenar.
        */

        ctx.strokeStyle =
            "#ff00d9";

        ctx.shadowColor =
            "#ff00d9";


        ctx.beginPath();

        ctx.moveTo(
            p.x + half,
            p.y
        );

        ctx.lineTo(
            p.x +
            half +
            15 *
            p.scale,
            p.y +
            8 *
            p.scale
        );

        ctx.stroke();


        ctx.restore();
    }
}


/* =========================================================
   FINISH
========================================================= */

function drawFinish() {

    const finishZ =
        ROAD_LENGTH -
        100;


    if (
        finishZ <
        player.z ||
        finishZ >
        player.z +
        DRAW_DISTANCE
    ) {
        return;
    }


    const p =
        project(
            finishZ
        );


    if (!p) {
        return;
    }


    const half =
        ROAD_WIDTH *
        p.scale *
        0.5;


    const left =
        p.x - half;

    const widthFinish =
        half * 2;


    const squares = 12;

    const squareWidth =
        widthFinish /
        squares;


    /*
       Siyah-beyaz finish.
    */

    for (
        let i = 0;
        i < squares;
        i++
    ) {

        ctx.fillStyle =
            i % 2 === 0
                ? "#ffffff"
                : "#050505";


        ctx.fillRect(
            left +
            i *
            squareWidth,

            p.y -
            10 *
            p.scale,

            squareWidth + 1,

            20 *
            p.scale
        );
    }


    /*
       FINISH yazısı.
    */

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.font =
        `900 ${Math.max(
            12,
            45 *
            p.scale
        )}px Arial`;

    ctx.fillStyle =
        "#00eaff";

    ctx.shadowBlur =
        20;

    ctx.shadowColor =
        "#00eaff";


    ctx.fillText(
        "FINISH",
        p.x,
        p.y -
        35 *
        p.scale
    );


    ctx.restore();
}


/* =========================================================
   MİNİBÜS
========================================================= */

function drawMinibus() {

    const x =
        width / 2 +
        player.offsetX *
        0.72;


    const y =
        height *
        0.73;


    const w = 82;

    const h = 112;


    ctx.save();


    ctx.translate(
        x,
        y
    );


    /*
       Drift açısı.

       Araç hareket yönünden hafif
       yana dönüyor.
    */

    const targetRotation =
        player.lateralVelocity *
        0.055;


    player.visualRotation +=
        (
            targetRotation -
            player.visualRotation
        ) *
        0.14;


    ctx.rotate(
        player.visualRotation
    );


    /*
       Gölge.
    */

    ctx.save();

    ctx.globalAlpha =
        0.35;

    ctx.filter =
        "blur(7px)";

    ctx.fillStyle =
        "#ff00dd";

    ctx.fillRect(
        -w * 0.55,
        h * 0.43,
        w * 1.1,
        10
    );

    ctx.restore();


    /*
       Alt neon.
    */

    ctx.save();

    ctx.shadowBlur =
        25;

    ctx.shadowColor =
        "#ff00dd";

    ctx.fillStyle =
        "#ff00dd";


    ctx.fillRect(
        -w * 0.47,
        h * 0.39,
        w * 0.94,
        5
    );

    ctx.restore();


    /*
       Minibüs gövdesi.
    */

    const body =
        ctx.createLinearGradient(
            -w / 2,
            0,
            w / 2,
            0
        );


    body.addColorStop(
        0,
        "#5600ff"
    );

    body.addColorStop(
        0.45,
        "#ff00d9"
    );

    body.addColorStop(
        1,
        "#7200ff"
    );


    ctx.fillStyle =
        body;

    ctx.shadowBlur =
        18;

    ctx.shadowColor =
        "#ff00d9";


    ctx.beginPath();

    ctx.roundRect(
        -w / 2,
        -h / 2,
        w,
        h,
        12
    );

    ctx.fill();


    /*
       Ön cam.
    */

    ctx.shadowBlur =
        5;

    ctx.fillStyle =
        "#041328";


    ctx.beginPath();

    ctx.roundRect(
        -w * 0.35,
        -h * 0.39,
        w * 0.70,
        h * 0.29,
        7
    );

    ctx.fill();


    /*
       Cam parlaması.
    */

    ctx.fillStyle =
        "rgba(0,234,255,0.7)";


    ctx.fillRect(
        -w * 0.27,
        -h * 0.34,
        w * 0.17,
        h * 0.05
    );


    /*
       Yan cam bölümü.
    */

    ctx.fillStyle =
        "#06152d";


    ctx.fillRect(
        -w * 0.40,
        -h * 0.05,
        w * 0.80,
        h * 0.17
    );


    /*
       Cam bölmeleri.
    */

    ctx.strokeStyle =
        "#ff62ee";

    ctx.lineWidth =
        2;


    for (
        let i = -1;
        i <= 1;
        i++
    ) {

        ctx.beginPath();

        ctx.moveTo(
            i * w * 0.20,
            -h * 0.05
        );

        ctx.lineTo(
            i * w * 0.20,
            h * 0.12
        );

        ctx.stroke();
    }


    /*
       Farlar.
    */

    ctx.save();

    ctx.shadowBlur =
        22;

    ctx.shadowColor =
        "#00eaff";

    ctx.fillStyle =
        "#00eaff";


    ctx.fillRect(
        -w * 0.38,
        h * 0.26,
        w * 0.21,
        h * 0.09
    );


    ctx.fillRect(
        w * 0.17,
        h * 0.26,
        w * 0.21,
        h * 0.09
    );


    ctx.restore();


    /*
       Tekerlekler.
    */

    ctx.fillStyle =
        "#020207";

    ctx.shadowBlur =
        8;

    ctx.shadowColor =
        "#00eaff";


    ctx.fillRect(
        -w * 0.55,
        -h * 0.25,
        9,
        25
    );


    ctx.fillRect(
        w * 0.45,
        -h * 0.25,
        9,
        25
    );


    ctx.fillRect(
        -w * 0.55,
        h * 0.23,
        9,
        25
    );


    ctx.fillRect(
        w * 0.45,
        h * 0.23,
        9,
        25
    );


    ctx.restore();
}


/* =========================================================
   DRIFT / SÜZÜLME FİZİĞİ
========================================================= */

function updateDriving(delta) {

    /*
       Delta'yı saniyeye çevir.
    */

    const dt =
        Math.min(
            delta,
            40
        ) / 16.6667;


    /*
       Direksiyon kuvveti.
    */

    let steering = 0;


    if (leftPressed) {
        steering -= 1;
    }


    if (rightPressed) {
        steering += 1;
    }


    /*
       Direksiyon yumuşak.

       Basılı tuttuğunda araç
       sürekli aynı yöne gider.
    */

    player.lateralVelocity +=
        steering *
        0.85 *
        dt;


    /*
       Sürtünme.

       Tuştan çekince araç
       hemen durmuyor.

       Bir süre kaymaya devam ediyor.
    */

    player.lateralVelocity *=
        Math.pow(
            0.91,
            dt
        );


    /*
       Maksimum yana kayma.
    */

    player.lateralVelocity =
        Math.max(
            -13,
            Math.min(
                13,
                player.lateralVelocity
            )
        );


    /*
       Araç pozisyonu.
    */

    player.offsetX +=
        player.lateralVelocity *
        dt *
        1.7;


    /*
       Yolun dönüşünü otomatik olarak
       biraz takip et.

       Burada amaç aracın otomatik
       yönlendirilmesi değil.

       Kamera ve yol dönerken
       araç da fiziksel olarak
       o dönüşün içinde kalır.
    */

    const slope =
        roadSlope(
            player.z
        );


    player.offsetX -=
        slope *
        FORWARD_SPEED *
        dt *
        0.004;


    /*
       Drift açısı.

       Hızlı sağa giderken sağa,
       hızlı sola giderken sola
       doğru gövde dönüyor.
    */

    const desiredDrift =
        player.lateralVelocity *
        0.055;


    player.driftAngle +=
        (
            desiredDrift -
            player.driftAngle
        ) *
        0.12;


    /*
       İLERLEME HIZI SABİT.

       Burada speed artırılmıyor.
    */

    player.z +=
        FORWARD_SPEED *
        delta /
        1000;


    /*
       Mesafe.
    */

    distance =
        player.z / 10;


    /*
       Yol dışına çıkma.
    */

    const roadLimit =
        ROAD_WIDTH *
        0.46;


    if (
        Math.abs(
            player.offsetX
        ) >
        roadLimit
    ) {

        beginFall();
    }
}


/* =========================================================
   DÜŞME
========================================================= */

function beginFall() {

    if (
        player.falling
    ) {
        return;
    }


    player.falling =
        true;

    player.fallTime =
        0;
}


function updateFall(delta) {

    player.fallTime +=
        delta;


    /*
       Araç aşağı doğru düşüyormuş
       gibi küçülmesi draw tarafında
       kullanılacak.
    */


    if (
        player.fallTime >=
        950
    ) {

        falls++;


        /*
           Başlangıç noktasına dön.
        */

        player.z =
            0;

        player.offsetX =
            0;

        player.lateralVelocity =
            0;

        player.driftAngle =
            0;

        player.visualRotation =
            0;

        player.falling =
            false;

        distance =
            0;
    }
}


/* =========================================================
   FINISH KONTROL
========================================================= */

function checkFinish() {

    if (
        player.z >=
        ROAD_LENGTH - 120
    ) {

        running =
            false;


        finishDistance.textContent =
            Math.floor(
                distance
            ) +
            " m";


        finishScreen.classList.remove(
            "hidden"
        );
    }
}


/* =========================================================
   GÜNCELLE
========================================================= */

function update(delta) {

    if (
        player.falling
    ) {

        updateFall(
            delta
        );

        return;
    }


    updateDriving(
        delta
    );


    checkFinish();


    distanceElement.textContent =
        Math.floor(
            distance
        ) +
        " m";


    fallsElement.textContent =
        falls;
}


/* =========================================================
   DÜŞEN MİNİBÜSÜ ÇİZ
========================================================= */

function drawFallingMinibus() {

    const progress =
        Math.min(
            player.fallTime /
            950,
            1
        );


    ctx.save();


    const x =
        width / 2 +
        player.offsetX *
        0.7;


    const y =
        height *
        0.73 +
        progress *
        progress *
        350;


    ctx.translate(
        x,
        y
    );


    ctx.rotate(
        progress *
        1.7
    );


    const scale =
        1 -
        progress *
        0.65;


    ctx.scale(
        scale,
        scale
    );


    /*
       Basit düşme gövdesi.
    */

    ctx.fillStyle =
        "#ff00d9";

    ctx.shadowBlur =
        20;

    ctx.shadowColor =
        "#ff00d9";


    ctx.fillRect(
        -40,
        -55,
        80,
        110
    );


    ctx.fillStyle =
        "#06152d";


    ctx.fillRect(
        -28,
        -42,
        56,
        28
    );


    ctx.restore();
}


/* =========================================================
   ÇİZ
========================================================= */

function draw() {

    drawBackground();

    drawRoad();

    drawRoadEdges();

    drawFinish();


    if (
        player.falling
    ) {

        drawFallingMinibus();

    } else {

        drawMinibus();
    }
}


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(time) {

    if (
        !running
    ) {

        draw();

        return;
    }


    const delta =
        Math.min(
            time -
            lastTime,
            40
        );


    lastTime =
        time;


    update(
        delta
    );


    draw();


    if (
        running
    ) {

        animationFrame =
            requestAnimationFrame(
                gameLoop
            );
    }
}


/* =========================================================
   OYUN BAŞLAT
========================================================= */

function startGame() {

    startScreen.classList.add(
        "hidden"
    );

    finishScreen.classList.add(
        "hidden"
    );


    player.z =
        0;

    player.offsetX =
        0;

    player.lateralVelocity =
        0;

    player.driftAngle =
        0;

    player.visualRotation =
        0;

    player.falling =
        false;

    player.fallTime =
        0;


    distance =
        0;

    falls =
        0;


    running =
        true;


    lastTime =
        performance.now();


    cancelAnimationFrame(
        animationFrame
    );


    animationFrame =
        requestAnimationFrame(
            gameLoop
        );
}


/* =========================================================
   BUTONLAR
========================================================= */

startButton.addEventListener(
    "click",
    startGame
);


restartButton.addEventListener(
    "click",
    startGame
);


/* =========================================================
   BAŞLANGIÇ
========================================================= */

draw();