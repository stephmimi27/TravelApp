/* Original pixel illustrations. All artwork stays sharp at any screen size. */
const Art = (() => {
  const rect = (x, y, w, h, c) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const poly = (p, c) => `<polygon points="${p}" fill="${c}"/>`;
  const svg = (body, view = "0 0 320 180", cls = "pixel-art") =>
    `<svg class="${cls}" viewBox="${view}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
  const cloud = (x, y, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})">${rect(0, 5, 32, 8, "#fff8e8") + rect(6, 0, 18, 6, "#fff8e8") + rect(25, 8, 13, 5, "#fff8e8")}</g>`;
  const tree = (x, y, s = 1, c = "#6c8f72") =>
    `<g transform="translate(${x} ${y}) scale(${s})">${rect(7, 23, 4, 13, "#9b8168") + rect(6, 0, 6, 6, c) + rect(3, 5, 12, 7, c) + rect(0, 11, 18, 7, c) + rect(2, 17, 14, 8, c) + rect(5, 20, 4, 5, "#587c64")}</g>`;
  const flower = (x, y, c = "#eeb6bc") =>
    rect(x + 3, y, 4, 3, c) +
    rect(x, y + 3, 10, 4, c) +
    rect(x + 3, y + 7, 4, 3, c) +
    rect(x + 3, y + 3, 4, 4, "#fae1a5");
  const water = (color = "#91b6b4") =>
    rect(0, 137, 320, 43, color) +
    Array.from({ length: 23 }, (_, i) =>
      rect(
        (i * 47) % 320,
        143 + ((i * 13) % 32),
        7 + (i % 5),
        1,
        i % 2 ? "#c4d7c8" : "#b5cec6",
      ),
    ).join("");
  function scene(type = "city") {
    let s = "";
    if (type === "japan") {
      s =
        rect(0, 0, 320, 180, "#eacbd3") +
        rect(0, 60, 320, 80, "#f0d6d5") +
        rect(236, 22, 24, 24, "#f8e3b3") +
        cloud(50, 20, 0.8) +
        cloud(150, 37, 0.6);
      s +=
        poly(
          "0,116 43,77 80,112 120,64 184,124 241,72 320,126 320,180 0,180",
          "#b8a9bd",
        ) +
        poly("68,129 147,65 222,133", "#c7b8c8") +
        poly("125,83 147,65 168,85 156,82 149,88 140,82", "#f9eee7");
      s +=
        rect(0, 132, 320, 48, "#b8bc9d") +
        rect(0, 148, 320, 32, "#c5c5a5") +
        rect(178, 104, 56, 54, "#b46f71") +
        rect(184, 112, 44, 46, "#d79b8e") +
        rect(196, 133, 17, 25, "#7c687a");
      [
        [93, 46],
        [111, 63],
        [128, 80],
      ].forEach(([y, w]) => {
        s +=
          rect(171 - (w - 46) / 2, y, w, 8, "#8b667d") +
          rect(177 - (w - 46) / 2, y - 5, w - 12, 5, "#8b667d") +
          rect(184, y + 8, 42, 11, "#d99b91") +
          rect(193, y + 10, 7, 9, "#86667a") +
          rect(212, y + 10, 7, 9, "#86667a");
      });
      s += rect(203, 69, 3, 20, "#8b667d");
      s +=
        rect(99, 125, 5, 32, "#b07976") +
        rect(141, 125, 5, 32, "#b07976") +
        rect(91, 121, 63, 5, "#b07976") +
        rect(94, 115, 57, 5, "#996d72") +
        rect(102, 129, 42, 4, "#b07976");
      [7, 33, 290].forEach((x, i) => {
        s +=
          rect(x + 10, 93, 5, 67, "#9a7f81") +
          rect(x, 76 + i * 6, 31, 24, "#e0a0b2") +
          rect(x - 5, 87 + i * 3, 41, 16, "#e8afbc") +
          rect(x + 5, 69 + i * 3, 20, 15, "#e7afbd") +
          rect(x + 23, 93, 12, 13, "#efc0c7");
      });
      s += poly("107,180 183,180 199,158 189,156 165,166 142,165", "#e5d6b3");
      for (let i = 0; i < 22; i++)
        s += rect((i * 73) % 320, 102 + ((i * 37) % 72), 2, 2, "#f8d8d5");
      s += flower(61, 150) + flower(259, 159) + flower(38, 165);
    } else if (type === "mountains") {
      s =
        rect(0, 0, 320, 180, "#c7dfe0") +
        rect(0, 61, 320, 100, "#dae8df") +
        rect(240, 19, 21, 21, "#fae9bc") +
        cloud(43, 24, 0.9) +
        cloud(182, 42, 0.6);
      s +=
        poly(
          "0,126 46,50 84,96 139,22 211,122 253,58 320,130 320,180 0,180",
          "#93a6b4",
        ) +
        poly("24,91 46,50 65,85 55,81 48,91 42,80 35,90", "#f6f4df") +
        poly("101,75 139,22 177,76 155,65 144,74 133,59 122,72", "#f5f3e1") +
        poly("229,91 253,58 278,94 260,82 254,90 245,80", "#f2f3dd");
      s +=
        poly(
          "0,144 0,118 39,114 68,135 91,122 122,140 320,134 320,180 0,180",
          "#79978a",
        ) + water("#83b5b2");
      for (let i = 0; i < 8; i++)
        s += tree(
          i * 22 - 10,
          111 - (i % 3) * 6,
          0.8,
          i % 2 ? "#4f7f72" : "#678c77",
        );
      for (let i = 0; i < 5; i++)
        s += tree(238 + i * 19, 106 + (i % 3) * 8, 1, "#597e6b");
      s +=
        poly("154,163 174,157 199,159 179,165", "#d8b880") +
        rect(171, 154, 3, 12, "#a5886b") +
        rect(184, 158, 14, 2, "#edcea1");
      s +=
        rect(0, 169, 87, 11, "#94aa82") +
        rect(0, 165, 45, 5, "#a1b58d") +
        flower(19, 162, "#d9c1d6");
    } else if (type === "montreal") {
      s =
        rect(0, 0, 320, 180, "#d7cbdc") +
        rect(0, 58, 320, 90, "#eddbd8") +
        rect(239, 26, 24, 24, "#f4ddb0") +
        cloud(35, 28, 0.8) +
        cloud(144, 17, 0.55);
      s +=
        rect(0, 105, 320, 75, "#ddc3b3") +
        rect(0, 147, 320, 33, "#c8b0a3") +
        rect(0, 154, 320, 2, "#e5cec0");
      const house = (x, y, w, c, roof) =>
        rect(x, y, w, 147 - y, c) +
        rect(x - 3, y - 6, w + 6, 6, roof) +
        rect(x + 5, y + 10, 8, 13, "#9c929d") +
        rect(x + w - 13, y + 10, 8, 13, "#9c929d") +
        rect(x + 5, y + 31, 8, 13, "#a89caa") +
        rect(x + w - 13, y + 31, 8, 13, "#a89caa") +
        rect(x + w / 2 - 5, 126, 10, 21, "#9d858a");
      s +=
        house(0, 88, 40, "#bca9b6", "#8d7e92") +
        house(43, 99, 38, "#d7ad9d", "#9c8390") +
        house(239, 94, 41, "#d4b5a3", "#a28993") +
        house(283, 82, 39, "#b4abb5", "#8e8498");
      s +=
        rect(109, 86, 101, 61, "#b5a6b2") +
        poly("105,90 159,56 213,90", "#91849b") +
        rect(116, 57, 17, 90, "#b4a6b2") +
        rect(188, 57, 17, 90, "#b4a6b2") +
        rect(112, 49, 25, 8, "#8b7c94") +
        rect(184, 49, 25, 8, "#8b7c94") +
        poly("118,49 124,33 131,49", "#8b7c94") +
        poly("190,49 196,33 203,49", "#8b7c94");
      for (let i = 0; i < 5; i++)
        s +=
          rect(120 + i * 16, 98, 7, 20, "#85788f") +
          rect(120 + i * 16, 96, 7, 4, "#d1bdc8");
      s +=
        rect(149, 123, 20, 25, "#8a7892") +
        rect(154, 119, 10, 5, "#8a7892") +
        rect(109, 147, 101, 5, "#bcabac") +
        rect(104, 152, 111, 4, "#c9b9b4");
      [74, 222].forEach((x) => {
        s +=
          rect(x, 119, 3, 32, "#8d7c87") +
          rect(x - 3, 112, 9, 9, "#f1dba5") +
          rect(x - 4, 110, 11, 3, "#8d7c87");
      });
      s += tree(19, 113, 1, "#a7a587") + tree(286, 119, 0.9, "#a19e7d");
      for (let i = 0; i < 12; i++)
        s += rect((i * 29) % 320, 161 + (i % 3) * 6, 14, 1, "#bba396");
    } else if (type === "coast") {
      s =
        rect(0, 0, 320, 180, "#c8e2db") +
        rect(236, 23, 25, 25, "#f9df9f") +
        cloud(30, 29) +
        cloud(169, 14, 0.7) +
        water("#8ebdbc");
      s +=
        poly("0,180 0,92 34,83 88,104 129,130 187,145 217,180", "#c4b6a1") +
        rect(0, 145, 90, 35, "#e4d1b4");
      for (let i = 0; i < 6; i++) {
        let x = i * 22 - 5,
          y = 83 + i * 8;
        s +=
          rect(x, y, 27, 61, "#efd8b6") +
          rect(x - 2, y - 4, 31, 5, i % 2 ? "#c58e86" : "#b69e95") +
          rect(x + 6, y + 10, 6, 11, "#a7b9b7") +
          rect(x + 17, y + 10, 6, 11, "#a7b9b7");
      }
      s +=
        rect(222, 102, 3, 41, "#c5ae8e") +
        poly("225,104 248,131 225,131", "#fff5db") +
        poly("220,112 204,131 220,131", "#eee0cb") +
        poly("204,136 250,136 240,143 213,143", "#ad8f8b");
      s += tree(17, 120, 1.2, "#95aa8b") + flower(62, 160, "#dfb0b6");
    } else {
      s =
        rect(0, 0, 320, 180, "#d5cedf") +
        rect(0, 53, 320, 93, "#e9d9da") +
        rect(233, 23, 24, 24, "#f3d2b0") +
        cloud(31, 28, 0.8) +
        cloud(139, 16, 0.55);
      s += poly(
        "0,113 41,83 80,114 122,72 181,115 244,69 320,111 320,147 0,147",
        "#b9a8bc",
      );
      for (let i = 0; i < 17; i++) {
        const x = i * 20 - 9,
          y = 62 + ((i * 37) % 60),
          w = 15 + (i % 4);
        const c = ["#a79aaa", "#bca6b4", "#9d99b0", "#c4b2bd"][i % 4];
        s += rect(x, y, w, 150 - y, c) + rect(x + 4, y - 5, w - 8, 5, c);
        for (let j = 0; j < 5; j++)
          for (let k = 0; k < 2; k++)
            s += rect(
              x + 3 + k * 7,
              y + 8 + j * 12,
              3,
              5,
              (i + j) % 3 ? "#e9cdaf" : "#c9bec7",
            );
      }
      s +=
        rect(172, 31, 5, 104, "#8c849e") +
        rect(169, 53, 11, 6, "#8c849e") +
        rect(167, 75, 15, 8, "#8c849e") +
        rect(174, 20, 1, 11, "#8c849e") +
        water("#a1b9bd");
      s +=
        poly("58,151 84,151 94,157 54,157", "#b88180") +
        rect(70, 129, 3, 25, "#b88180") +
        poly("69,132 56,147 69,147", "#e0bdab") +
        poly("75,132 87,147 75,147", "#e8c9b5");
      s += rect(0, 170, 320, 10, "#c6bbad") + rect(0, 167, 320, 3, "#d9c9b7");
    }
    return svg(s);
  }
  const paths = {
    globe: "M3 5h3V2h12v3h3v14h-3v3H6v-3H3V5Zm0 4h18M3 15h18M9 2v20M15 2v20",
    book: "M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3V3Zm9 2v17M6 7h3M6 11h3M15 7h3M15 11h3",
    compass: "M4 2h16v2h2v16h-2v2H4v-2H2V4h2V2Zm12 6-3 7-5 1 3-7 5-1Z",
    plane: "M2 10h7V3l3-1v8h7l3 2-3 2h-7v7l-3-1v-6H2l2-2-2-2Z",
    camera: "M3 7h4V4h10v3h4v13H3V7Zm6 4h6v6H9v-6Z",
    pin: "M5 3h14v3h2v8h-3v3h-3v3h-3v2h-1v-2H8v-3H5v-3H3V6h2V3Zm4 4h6v6H9V7Z",
    flag: "M4 22V2h13v4h4v9H9v-4H4M9 2v9",
    heart: "M3 5h6v3h6V5h6v10h-3v3h-3v3H9v-3H6v-3H3V5Z",
    plus: "M12 5v14M5 12h14",
    arrow: "M4 12h15M14 6l6 6-6 6",
    back: "M20 12H5m5-6-6 6 6 6",
    star: "M10 2h4v6h7v5h-5v8l-4-4-4 4v-8H3V8h7V2Z",
    calendar: "M4 5h16v16H4V5ZM8 2v6M16 2v6M4 10h16M8 14h2M14 14h2M8 18h2",
    settings: "M8 2h8v4h4v12h-4v4H8v-4H4V6h4V2Zm1 7h6v6H9V9Z",
    search: "M3 3h11v11H3V3Zm11 11 7 7",
    close: "M5 5l14 14M19 5 5 19",
    check: "m4 12 5 5L20 6",
    edit: "m3 16 12-12 5 5L8 21H3v-5Zm10-10 5 5",
    trash: "M3 6h18M8 6V3h8v3M6 6v15h12V6M10 10v7M14 10v7",
    download: "M12 2v13m-5-5 5 5 5-5M4 17v5h16v-5",
    upload: "M12 16V3m-5 5 5-5 5 5M4 17v5h16v-5",
    sparkle: "M10 2h4v6h6v4h-6v8h-4v-8H4V8h6V2Z",
    clock: "M5 2h14v3h3v14h-3v3H5v-3H2V5h3V2Zm7 4v7h5",
    instagram: "M5 2h14v2h3v15h-3v3H5v-3H2V4h3V2Zm3 6h8v8H8V8Zm10-3h1",
    video: "M3 5h13v14H3V5Zm13 5 5-3v10l-5-3",
    lock: "M5 10h14v11H5V10Zm3 0V3h8v7",
  };
  function icon(name, size = 20, filled = false) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter" stroke-linecap="square"><path d="${paths[name] || paths.sparkle}"/></svg>`;
  }
  function backpack() {
    return svg(
      rect(7, 1, 10, 4, "#6d5e83") +
        rect(5, 4, 14, 15, "#9b88b2") +
        rect(3, 8, 2, 10, "#6d5e83") +
        rect(19, 8, 2, 10, "#6d5e83") +
        rect(7, 11, 10, 7, "#c1adcd") +
        rect(9, 10, 6, 2, "#6d5e83") +
        rect(5, 19, 14, 2, "#6d5e83") +
        rect(10, 5, 4, 4, "#e8d59e"),
      "0 0 24 24",
      "brand-backpack",
    );
  }
  function avatar() {
    return svg(
      rect(7, 2, 10, 3, "#7c6174") +
        rect(5, 5, 14, 10, "#7c6174") +
        rect(7, 5, 10, 10, "#e4ba9e") +
        rect(7, 4, 10, 3, "#7c6174") +
        rect(9, 8, 2, 2, "#685266") +
        rect(14, 8, 2, 2, "#685266") +
        rect(10, 12, 5, 1, "#b98884") +
        rect(6, 16, 13, 7, "#99aa8b") +
        rect(4, 18, 3, 5, "#99aa8b") +
        rect(18, 18, 3, 5, "#99aa8b"),
      "0 0 24 24",
    );
  }
  function pin(dream = false) {
    return svg(
      rect(3, 0, 10, 2, dream ? "#b39b68" : "#6c557f") +
        rect(1, 2, 14, 10, dream ? "#b39b68" : "#6c557f") +
        rect(3, 12, 10, 3, dream ? "#b39b68" : "#6c557f") +
        rect(5, 15, 6, 3, dream ? "#b39b68" : "#6c557f") +
        rect(7, 18, 2, 3, dream ? "#b39b68" : "#6c557f") +
        rect(3, 3, 10, 8, dream ? "#f1d589" : "#b7a0ca") +
        rect(6, 5, 4, 4, "#fff5e7"),
      "0 0 16 21",
      "",
    );
  }
  function world() {
    const polygons = [
      [
        [-168, 70],
        [-155, 72],
        [-145, 66],
        [-131, 70],
        [-119, 74],
        [-100, 79],
        [-76, 76],
        [-59, 58],
        [-73, 44],
        [-82, 25],
        [-90, 19],
        [-103, 24],
        [-113, 31],
        [-124, 47],
        [-141, 59],
        [-162, 60],
      ],
      [
        [-97, 24],
        [-85, 22],
        [-82, 10],
        [-77, 8],
        [-77, 3],
        [-84, 7],
        [-91, 16],
      ],
      [
        [-80, 9],
        [-67, 10],
        [-50, -1],
        [-35, -7],
        [-40, -23],
        [-53, -35],
        [-65, -55],
        [-74, -49],
        [-76, -24],
        [-81, -4],
      ],
      [
        [-57, 82],
        [-28, 79],
        [-22, 66],
        [-44, 60],
        [-60, 66],
      ],
      [
        [-11, 36],
        [-10, 45],
        [-2, 49],
        [-6, 58],
        [9, 59],
        [20, 70],
        [39, 69],
        [38, 56],
        [30, 47],
        [43, 40],
        [28, 36],
        [18, 41],
        [9, 38],
        [2, 37],
      ],
      [
        [-17, 34],
        [4, 37],
        [25, 32],
        [34, 31],
        [43, 12],
        [51, 10],
        [42, -15],
        [32, -30],
        [18, -35],
        [10, -15],
        [-1, 4],
        [-15, 11],
      ],
      [
        [30, 70],
        [56, 73],
        [81, 77],
        [109, 75],
        [142, 70],
        [180, 65],
        [175, 52],
        [151, 50],
        [140, 37],
        [127, 32],
        [121, 21],
        [108, 20],
        [108, 7],
        [100, 1],
        [94, 10],
        [85, 22],
        [78, 8],
        [71, 22],
        [61, 26],
        [51, 30],
        [42, 42],
        [32, 48],
      ],
      [
        [41, 31],
        [50, 30],
        [57, 23],
        [51, 13],
        [44, 12],
        [36, 23],
      ],
      [
        [113, -22],
        [121, -15],
        [135, -11],
        [142, -14],
        [145, -22],
        [154, -27],
        [150, -39],
        [137, -38],
        [127, -34],
        [114, -35],
      ],
      [
        [95, 5],
        [107, -5],
        [105, -8],
        [98, -4],
      ],
      [
        [107, -6],
        [120, -8],
        [127, -9],
        [131, -6],
        [139, -5],
        [149, -7],
        [150, -11],
        [138, -11],
        [127, -9],
        [116, -9],
      ],
      [
        [138, 35],
        [142, 44],
        [146, 44],
        [144, 36],
        [137, 33],
        [131, 31],
      ],
      [
        [47, -13],
        [50, -16],
        [47, -26],
        [44, -24],
      ],
      [
        [-8, 51],
        [-6, 58],
        [-2, 59],
        [1, 51],
      ],
      [
        [166, -35],
        [174, -40],
        [178, -41],
        [174, -47],
        [168, -46],
      ],
      [
        [120, 18],
        [125, 13],
        [126, 7],
        [122, 8],
      ],
    ];
    const inside = (x, y, p) => {
      let c = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        if (
          p[i][1] > y !== p[j][1] > y &&
          x <
            ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) +
              p[i][0]
        )
          c = !c;
      }
      return c;
    };
    const isLand = (x, y) => polygons.some((p) => inside(x, y, p));
    let s = rect(0, 0, 360, 180, "#e6f0e9");
    for (let y = 8; y < 164; y += 3)
      for (let x = 1; x < 358; x += 3) {
        if (isLand(x - 180, 90 - y)) {
          const shore =
            !isLand(x - 183, 90 - y) ||
            !isLand(x - 177, 90 - y) ||
            !isLand(x - 180, 93 - y) ||
            !isLand(x - 180, 87 - y);
          let c = shore
            ? "#b2c8a5"
            : ["#bdcfb2", "#b8cdae", "#c3d3b7", "#b5c9a9"][
                (x * 13 + y * 17) % 4
              ];
          s += rect(x, y, 3, 3, c);
        }
      }
    for (let i = 0; i < 20; i++)
      s += rect(15 + ((i * 67) % 330), 17 + ((i * 31) % 140), 5, 1, "#d4e6db");
    s += `<g fill="#93ab90" font-size="5.2" font-family="RoamPixel,monospace" letter-spacing=".7"><text x="58" y="73">N. AMERICA</text><text x="104" y="129">S. AMERICA</text><text x="176" y="64">EUROPE</text><text x="188" y="109">AFRICA</text><text x="265" y="65">ASIA</text><text x="292" y="135">OCEANIA</text></g>`;
    [
      [67, 52],
      [79, 47],
      [111, 119],
      [198, 89],
      [264, 44],
      [282, 62],
      [308, 127],
    ].forEach(([x, y], i) => {
      s += tree(x, y, 0.18, i % 2 ? "#9fb692" : "#a3ba99");
    });
    s += `<g fill="none" stroke="#f6f9ed" stroke-width=".65" stroke-dasharray="2 3"><path d="M66 39 Q166 -4 294 64"/><path d="M106 44 Q182 95 294 64"/></g>`;
    return svg(s, "0 0 360 180", "world-canvas");
  }
  return { scene, icon, backpack, avatar, pin, world };
})();
