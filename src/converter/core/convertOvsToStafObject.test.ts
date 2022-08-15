import IBayLevelData, {
  IBayLevelDataStaf,
} from "../../models/v1/parts/IBayLevelData";
import ILidData, { ILidDataFromStaf } from "../../models/v1/parts/ILidData";
import IShipData, {
  IMasterCGs,
  IShipDataFromStaf,
} from "../../models/v1/parts/IShipData";
import convertOvsToStafObject, {
  getNestedValue,
} from "../core/convertOvsToStafObject";

import BayLevelConfig from "../sections/ovsToStaf/BayLevelConfig";
import BayLevelEnum from "../../models/base/enums/BayLevelEnum";
import ForeAftEnum from "../../models/base/enums/ForeAftEnum";
import ISectionMapToStafConfig from "../types/ISectionMapToStafConfig";
import ISlotData from "../../models/v1/parts/ISlotData";
import IStackStafData from "../types/IStackStafData";
import ITierStafData from "../types/ITierStafData";
import { LINE_SEPARATOR } from "../sections/ovsToStaf/consts";
import LidConfig from "../sections/ovsToStaf/LidConfig";
import PositionFormatEnum from "../../models/base/enums/PositionFormatEnum";
import ShipConfig from "../sections/ovsToStaf/ShipConfig";
import SlotConfig from "../sections/ovsToStaf/SlotConfig";
import StackConfig from "../sections/ovsToStaf/StackConfig";
import TierConfig from "../sections/ovsToStaf/TierConfig";
import ValuesSourceEnum from "../../models/base/enums/ValuesSourceEnum";
import { createMockedSimpleBayLevelData } from "../mocks/bayLevelData";

interface IDummy {
  var1: string;
  moreVars: {
    var2: string;
    var3: string;
    varX: {
      varY: string;
    };
  };
  var4: number;
  var5: number;
  var6: number | undefined;
}

const dummyData: IDummy = {
  var1: "AAA",
  moreVars: {
    var2: "BBB",
    var3: "CCC",
    varX: {
      varY: "YYY",
    },
  },
  var4: 1,
  var5: 0,
  var6: undefined,
};

describe("getNestedValue should...", () => {
  it("work ok", () => {
    expect(getNestedValue<IDummy>(dummyData, "var1")).toBe("AAA");
    expect(getNestedValue<IDummy>(dummyData, "moreVars.var2")).toBe("BBB");
    expect(getNestedValue<IDummy>(dummyData, "moreVars.var3")).toBe("CCC");
    expect(getNestedValue<IDummy>(dummyData, "moreVars.varX.varY")).toBe("YYY");
    expect(getNestedValue<IDummy>(dummyData, "var4")).toBe(1);
    expect(getNestedValue<IDummy>(dummyData, "var5")).toBe(0);
    expect(getNestedValue<IDummy>(dummyData, "var6")).toBeUndefined();
  });
});

describe("convertOvsToStafObject should", () => {
  const sectionConfig: ISectionMapToStafConfig<IDummy, IDummy> = {
    stafSection: "DUMMY",
    mapVars: [
      { stafVar: "VAR1", source: "var1", passValue: true },
      {
        stafVar: "VAR2",
        source: "moreVars.var2",
        passValue: true,
      },
      {
        stafVar: "VAR3",
        source: "moreVars.var3",
        passValue: true,
      },
      { stafVar: "VAR4", source: "var4", mapper: (s) => (s ? "Y" : "N") },
      {
        stafVar: "VAR5",
        source: "var5",
        mapper: (s) => (Number(s) + 1000).toString(),
      },
      {
        stafVar: "VAR6",
        source: "var6",
        passValue: true,
      },
      {
        stafVar: "VAR FIXED",
        fixedValue: "METRIC",
      },
    ],
  };

  it("applies the mappers correctly", () => {
    const processed = convertOvsToStafObject<IDummy, IDummy>(
      [dummyData],
      sectionConfig
    );

    const expectedRes =
      "*DUMMY\n**VAR1\tVAR2\tVAR3\tVAR4\tVAR5\tVAR6\tVAR FIXED\nAAA\tBBB\tCCC\tY\t1000\t-\tMETRIC";

    expect(processed).toBe(expectedRes);
  });
});

describe("for SHIP data", () => {
  it("work ok with mocked data of header", () => {
    const shipData: IShipData = {
      shipClass: "MY CLASS",
      containersLengths: [],
      lcgOptions: { values: ValuesSourceEnum.KNOWN, lpp: 200 },
      tcgOptions: { values: ValuesSourceEnum.ESTIMATED },
      vcgOptions: { values: ValuesSourceEnum.ESTIMATED },
      positionFormat: PositionFormatEnum.BAY_STACK_TIER,
      metaInfo: {},
      masterCGs: { aboveTcgs: {}, belowTcgs: {}, bottomBases: {} },
    };

    const processed = convertOvsToStafObject<IShipData, IShipDataFromStaf>(
      [shipData],
      ShipConfig
    );

    const expectedRes =
      "*SHIP\n**CLASS\tUNITS\tLCG IN USE\tLCG REF PT\tLCG + DIR\tVCG IN USE\tTCG IN USE\tTCG + DIR\tPOSITION FORMAT\nMY CLASS\tMETRIC\tY\tAP\tF\tSTACK\tN\tSTBD\tBAY-STACK-TIER";

    expect(processed).toBe(expectedRes);
  });
});

describe("for STAF_BAY data", () => {
  it("work ok with mocked data of bays", () => {
    const bayLevelData = createMockedSimpleBayLevelData(
      3,
      ["0282", "0082", "0182", "0284", "0084", "0184", "0080"],
      ["0218", "0018", "0118", "0016"]
    );

    const [b001Above, b001Below, b003Above, b003Below] = bayLevelData;

    // Check that MOCKED data is ok, to be sure further data modifications are correct
    expect(b001Above.isoBay).toBe("001");
    expect(b001Above.level).toBe(BayLevelEnum.ABOVE);
    expect(b001Below.isoBay).toBe("001");
    expect(b001Below.level).toBe(BayLevelEnum.BELOW);
    expect(b003Above.isoBay).toBe("003");
    expect(b003Above.level).toBe(BayLevelEnum.ABOVE);
    expect(b003Below.isoBay).toBe("003");
    expect(b003Below.level).toBe(BayLevelEnum.BELOW);

    // Modify data to check it in the result
    addMockedAttributes(b001Above, b001Below, b003Above, b003Below);

    const processed = convertOvsToStafObject<IBayLevelDataStaf, IBayLevelData>(
      bayLevelData,
      BayLevelConfig
    );

    const processedLines = processed.split(LINE_SEPARATOR);
    expect(processedLines.length).toBe(1 + 1 + 4);
    expect(processedLines[0]).toBe("*SECTION");
    expect(processedLines[1]).toBe(
      "**STAF BAY\tLEVEL\t20 NAME\t40 NAME\tSL Hatch\tSL ForeAft\tLCG 20\tLCG 40\tLCG 45\tLCG 48\tSTACK WT 20\tSTACK WT 40\tSTACK WT 45\tSTACK WT 48\tMAX HEIGHT\tPAIRED BAY\tREEFER PLUGS\tDOORS\tATHWARTSHIPS\tBULKHEAD\tBULKHEAD LCG\tLCG 24\tSTACK WT 24"
    );
    expect(processedLines[2]).toBe(
      "01\tA\t001-Label-20-A\t001-Label-40-A\t-\t-\t-\t-\t-\t-\t-\t-\t-\t-\t5\tA\t-\t-\tY\tN\t-\t-\t-"
    );
    expect(processedLines[3]).toBe(
      "01\tB\t001-Label-20-B\t001-Label-40-B\t-\t-\t-\t-\t-\t-\t-\t-\t-\t-\t4.5\tA\t-\t-\tN\tY\t119\t-\t-"
    );
    expect(processedLines[4]).toBe(
      "03\tA\t-\t-\t-\t-\t100\t110\t111\t112\t2\t2.1\t2.2\t2.3\t5.5\tF\t-\tA\tN\tN\t-\t-\t-"
    );
    expect(processedLines[5]).toBe(
      "03\tB\t-\t-\t-\t-\t100\t-\t-\t-\t2.1\t-\t-\t-\t5.2\tF\t-\tA\tN\tN\t-\t99\t2.9"
    );
  });
});

describe("for STACK data", () => {
  it("work ok with mocked data of stacks", () => {
    const bayLevelData = createMockedSimpleBayLevelData(
      3,
      ["0282", "0082", "0182", "0284", "0084", "0184"],
      ["0218", "0018", "0118", "0016"]
    );

    const [b001Above, b001Below, b003Above, b003Below] = bayLevelData;
    addMockedAttributes(b001Above, b001Below, b003Above, b003Below);

    const masterCGs: IMasterCGs = {
      aboveTcgs: { "02": -3000, "00": 0, "01": 3000 },
      belowTcgs: { "02": -3500, "00": 500, "01": 3500 },
      bottomBases: {},
    };

    const data = StackConfig.preProcessor(bayLevelData, masterCGs);

    const processed = convertOvsToStafObject<IStackStafData, IStackStafData>(
      data,
      StackConfig
    );

    const processedLines = processed.split(LINE_SEPARATOR);
    expect(processedLines.length).toBe(1 + 1 + 12);
    expect(processedLines[0]).toBe("*STACK");
    expect(processedLines[1]).toBe(
      "**STAF BAY\tLEVEL\tISO STACK\tCUSTOM STACK\tTOP TIER\tBOTTOM TIER\tBOTTOM VCG\tTCG\tACCEPTS 20\tACCEPTS 40\tACCEPTS 45\tACCEPTS 48\tLCG 20\tLCG 40\tLCG 45\tLCG 48\tSTACK WT 20\tSTACK WT 40\tSTACK WT 45\tSTACK WT 48\tMAX HT\tACCEPTS 24\tLCG 24\tSTACK WT 24\t20 ISO STK\t40 ISO STK"
    );
    expect(processedLines[2]).toBe(
      "01\tA\t00\t-\t84\t82\t21.1\t0\tY\tN\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t5\tY\t-\t-\t0100\t-"
    );
    expect(processedLines[3]).toBe(
      "01\tA\t01\t-\t84\t82\t21.1\t3\tY\tN\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t5\tY\t-\t-\t0101\t-"
    );
    expect(processedLines[4]).toBe(
      "01\tA\t02\t-\t84\t82\t21.1\t-3\tY\tN\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t5\tY\t-\t-\t0102\t-"
    );
    expect(processedLines[5]).toBe(
      "01\tB\t00\t-\t18\t16\t15.3\t0.5\tY\tN\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t7\tY\t-\t-\t0100\t-"
    );
    expect(processedLines[6]).toBe(
      "01\tB\t01\t-\t18\t18\t17.2\t3.5\tY\tN\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t4.5\tY\t-\t-\t0101\t-"
    );
    expect(processedLines[7]).toBe(
      "01\tB\t02\t-\t18\t18\t17.2\t-3.5\tY\tN\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t4.5\tY\t-\t-\t0102\t-"
    );
    expect(processedLines[8]).toBe(
      "03\tA\t00\t-\t84\t82\t21.1\t0\tY\tY\tY\tY\t100\t102.5\t107.5\t110\t1.25\t2.25\t2.26\t2.27\t5.5\tY\t105\t1.26\t0300\t0200"
    );
    expect(processedLines[9]).toBe(
      "03\tA\t01\t-\t84\t82\t21.1\t3\tY\tY\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t5.5\tN\t-\t-\t0301\t0201"
    );
    expect(processedLines[10]).toBe(
      "03\tA\t02\t-\t84\t82\t21.1\t-3\tY\tY\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t5.5\tN\t-\t-\t0302\t0202"
    );
    expect(processedLines[11]).toBe(
      "03\tB\t00\t-\t18\t16\t15.3\t0.5\tY\tY\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t7\tN\t-\t-\t0300\t0200"
    );
    expect(processedLines[12]).toBe(
      "03\tB\t01\t-\t18\t18\t17.2\t3.5\tY\tY\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t5.2\tN\t-\t-\t0301\t0201"
    );
    expect(processedLines[13]).toBe(
      "03\tB\t02\t-\t18\t18\t17.2\t-3.5\tY\tY\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t5.2\tN\t-\t-\t0302\t0202"
    );
  });

  it("work ok with mocked data of stacks WITH tier < 82", () => {
    const bayLevelData = createMockedSimpleBayLevelData(
      3,
      ["0282", "0082", "0182", "0284", "0084", "0184", "0080"],
      ["0218", "0018", "0118", "0016"]
    );

    const [b001Above, b001Below, b003Above, b003Below] = bayLevelData;
    addMockedAttributes(b001Above, b001Below, b003Above, b003Below);

    const masterCGs: IMasterCGs = {
      aboveTcgs: { "02": -3000, "00": 0, "01": 3000 },
      belowTcgs: { "02": -3500, "00": 500, "01": 3500 },
      bottomBases: {},
    };

    const data = StackConfig.preProcessor(bayLevelData, masterCGs);

    const processed = convertOvsToStafObject<IStackStafData, IStackStafData>(
      data,
      StackConfig
    );

    const processedLines = processed.split(LINE_SEPARATOR);
    expect(processedLines.length).toBe(1 + 1 + 12);

    // Explanation. Tiers should be from 80 to 84. However, STAF is inconsistent.
    // It shows +82 in STACK Section, Then the mapping of 82->80 in TIERS Section and uses "80" in SLOTS Section.
    // Therefore, we look for 86-82 here though it should be 84-80.
    expect(processedLines[2]).toBe(
      "01\tA\t00\t-\t86\t82\t21.1\t0\tY\tN\tN\tN\t-\t-\t-\t-\t-\t-\t-\t-\t5\tY\t-\t-\t0100\t-"
    );
    expect(processedLines[8]).toBe(
      "03\tA\t00\t-\t86\t82\t21.1\t0\tY\tY\tY\tY\t100\t102.5\t107.5\t110\t1.25\t2.25\t2.26\t2.27\t5.5\tY\t105\t1.26\t0300\t0200"
    );
  });
});

describe("for TIER data", () => {
  it("work ok with mocked data of tiers WITHOUT < 82", () => {
    const bayLevelData = createMockedSimpleBayLevelData(
      3,
      ["0282", "0082", "0182", "0284", "0084", "0184"],
      ["0218", "0018", "0118", "0016"]
    );

    const [b001Above, b001Below, b003Above, b003Below] = bayLevelData;
    addMockedAttributes(b001Above, b001Below, b003Above, b003Below);

    const data = TierConfig.preProcessor(bayLevelData);

    const processed = convertOvsToStafObject<ITierStafData, ITierStafData>(
      data,
      TierConfig
    );

    const processedLines = processed.split(LINE_SEPARATOR);
    expect(processedLines.length).toBe(2);
  });

  it("work ok with mocked data of tiers WITH < 82", () => {
    const bayLevelData = createMockedSimpleBayLevelData(
      3,
      ["0282", "0082", "0182", "0284", "0084", "0184", "0080"],
      ["0218", "0018", "0118", "0016"]
    );

    const [b001Above, b001Below, b003Above, b003Below] = bayLevelData;
    addMockedAttributes(b001Above, b001Below, b003Above, b003Below);

    const data = TierConfig.preProcessor(bayLevelData);

    const processed = convertOvsToStafObject<ITierStafData, ITierStafData>(
      data,
      TierConfig
    );

    const processedLines = processed.split(LINE_SEPARATOR);
    expect(processedLines.length).toBe(1 + 1 + 6);
    expect(processedLines[0]).toBe("*TIER");
    expect(processedLines[1]).toBe(
      "**STAF BAY\tLEVEL\tISO TIER\tCUSTOM TIER\tTIER VCG"
    );
    expect(processedLines[2]).toBe("01\tA\t82\t80\t-");
    expect(processedLines[3]).toBe("01\tA\t84\t82\t-");
    expect(processedLines[4]).toBe("01\tA\t86\t84\t-");
    expect(processedLines[5]).toBe("03\tA\t82\t80\t-");
    expect(processedLines[6]).toBe("03\tA\t84\t82\t-");
    expect(processedLines[7]).toBe("03\tA\t86\t84\t-");
  });
});

describe("for SLOT data", () => {
  it("work ok with mocked data of slots", () => {
    const bayLevelData = createMockedSimpleBayLevelData(
      3,
      ["0282", "0082", "0182", "0284", "0084", "0184", "0080"],
      ["0218", "0018", "0118", "0016"]
    );

    const [b001Above, b001Below, b003Above, b003Below] = bayLevelData;
    addMockedAttributes(b001Above, b001Below, b003Above, b003Below);

    b001Below.perSlotInfo["0018"].sizes = {};
    b001Below.perSlotInfo["0118"].reefer = 1;
    b001Below.perSlotInfo["0218"].reefer = 1;
    b001Below.perSlotInfo["0018"].restricted = 1;

    const data = SlotConfig.preProcessor(bayLevelData);

    const processed = convertOvsToStafObject<ISlotData, ISlotData>(
      data,
      SlotConfig
    );

    const processedLines = processed.split(LINE_SEPARATOR);
    expect(processedLines.length).toBe(1 + 1 + 7);
    expect(processedLines[0]).toBe("*SLOT");
    expect(processedLines[1]).toBe(
      "**SLOT\tACCEPTS 20\tACCEPTS 40\tACCEPTS 45\tACCEPTS 48\tREEFER TYPE\tACCEPTS 24"
    );
    expect(processedLines[2]).toBe("010082\tY\tN\tN\tN\tN\tY");
    expect(processedLines[3]).toBe("010018\tN\tN\tN\tN\tN\tN");
    expect(processedLines[4]).toBe("010118\tY\tN\tN\tN\tI\tY");
    expect(processedLines[5]).toBe("010218\tY\tN\tN\tN\tI\tY");
    expect(processedLines[6]).toBe("030082\tY\tY\tN\tN\tN\tN");
    expect(processedLines[7]).toBe("030084\tY\tY\tN\tN\tN\tN");
    expect(processedLines[8]).toBe("030086\tY\tY\tN\tN\tN\tN");
  });
});

describe("for LID data", () => {
  it("work ok with mocked data of lids (hatch covers)", () => {
    const lidData: ILidData[] = [
      {
        startIsoBay: "001",
        endIsoBay: "003",
        portIsoStack: "06",
        starboardIsoStack: "00",
        label: "1A01",
      },
      {
        startIsoBay: "001",
        endIsoBay: "001",
        portIsoStack: "01",
        starboardIsoStack: "03",
        label: "1A02",
        overlapStarboard: 1,
      },
      {
        startIsoBay: "001",
        endIsoBay: "001",
        portIsoStack: "05",
        starboardIsoStack: "07",
        label: "1A03",
      },
      {
        startIsoBay: "003",
        endIsoBay: "003",
        portIsoStack: "05",
        starboardIsoStack: "07",
        label: "3A03",
        overlapPort: 1,
      },
      {
        startIsoBay: "003",
        endIsoBay: "007",
        portIsoStack: "06",
        starboardIsoStack: "00",
        label: "3A04",
      },
    ];

    const expectedOutput: ILidDataFromStaf[] = [
      {
        isoBay: "001",
        portIsoStack: "06",
        starboardIsoStack: "00",
        label: "D000",
        level: BayLevelEnum.ABOVE,
        joinLidAftLabel: "D001",
      },
      {
        isoBay: "003",
        portIsoStack: "06",
        starboardIsoStack: "00",
        label: "D001",
        level: BayLevelEnum.ABOVE,
        joinLidFwdLabel: "D000",
      },
      {
        isoBay: "001",
        portIsoStack: "01",
        starboardIsoStack: "03",
        label: "1A02",
        level: BayLevelEnum.ABOVE,
        overlapStarboard: "Y",
      },
      {
        isoBay: "001",
        portIsoStack: "05",
        starboardIsoStack: "07",
        label: "1A03",
        level: BayLevelEnum.ABOVE,
      },
      {
        isoBay: "003",
        portIsoStack: "05",
        starboardIsoStack: "07",
        label: "3A03",
        level: BayLevelEnum.ABOVE,
        overlapPort: "Y",
      },
      {
        isoBay: "003",
        portIsoStack: "06",
        starboardIsoStack: "00",
        label: "D002",
        joinLidAftLabel: "D003",
        level: BayLevelEnum.ABOVE,
      },
      {
        isoBay: "005",
        portIsoStack: "06",
        starboardIsoStack: "00",
        label: "D003",
        joinLidFwdLabel: "D002",
        joinLidAftLabel: "D004",
        level: BayLevelEnum.ABOVE,
      },
      {
        isoBay: "007",
        portIsoStack: "06",
        starboardIsoStack: "00",
        label: "D004",
        joinLidFwdLabel: "D003",
        level: BayLevelEnum.ABOVE,
      },
    ];

    expect(lidData.length).toBe(5);

    console.log(JSON.stringify(lidData, null, 2));

    // Test pre-processor
    const data = LidConfig.preProcessor(lidData);
    expect(data.length).toBe(8);
    expect(data).toEqual(expectedOutput);

    const processed = convertOvsToStafObject<
      ILidDataFromStaf,
      ILidDataFromStaf
    >(data, LidConfig);

    const processedLines = processed.split(LINE_SEPARATOR);
    expect(processedLines.length).toBe(10);
    expect(processedLines[0]).toBe("*LID");
    expect(processedLines[1]).toBe(
      "**LID ID\tSTAF BAY\tLEVEL\tPORT ISO STACK\tSTBD ISO STACK\tJOIN LID FWD\tJOIN LID AFT\tOVERLAP PORT\tOVERLAP STBD"
    );
    expect(processedLines[2]).toBe("D000\t001\tA\t06\t00\t-\tD001\t-\t-");
    expect(processedLines[3]).toBe("D001\t003\tA\t06\t00\tD000\t-\t-\t-");
    expect(processedLines[4]).toBe("1A02\t001\tA\t01\t03\t-\t-\t-\tY");
    expect(processedLines[6]).toBe("3A03\t003\tA\t05\t07\t-\t-\tY\t-");
    expect(processedLines[7]).toBe("D002\t003\tA\t06\t00\t-\tD003\t-\t-");
    expect(processedLines[8]).toBe("D003\t005\tA\t06\t00\tD002\tD004\t-\t-");
    expect(processedLines[9]).toBe("D004\t007\tA\t06\t00\tD003\t-\t-\t-");
  });
});

function addMockedAttributes(
  b001Above: IBayLevelDataStaf,
  b001Below: IBayLevelDataStaf,
  b003Above: IBayLevelDataStaf,
  b003Below: IBayLevelDataStaf
) {
  b001Above.label20 = "001-Label-20-A";
  b001Below.label20 = "001-Label-20-B";
  b001Above.label40 = "001-Label-40-A";
  b001Below.label40 = "001-Label-40-B";

  b003Above.infoByContLength = {
    20: { lcg: 100000, size: 20, stackWeight: 2000000 },
    40: { lcg: 110000, size: 40, stackWeight: 2100000 },
    45: { lcg: 111000, size: 45, stackWeight: 2200000 },
    48: { lcg: 112000, size: 48, stackWeight: 2300000 },
    53: { lcg: 113000, size: 53, stackWeight: 2400000 },
  };
  b003Below.infoByContLength = {
    20: { lcg: 100000, size: 20, stackWeight: 2100000 },
    24: { lcg: 99000, size: 24, stackWeight: 2900000 },
  };

  b001Above.pairedBay = ForeAftEnum.AFT;
  b001Below.pairedBay = ForeAftEnum.AFT;
  b003Above.pairedBay = ForeAftEnum.FWD;
  b003Below.pairedBay = ForeAftEnum.FWD;

  b003Above.doors = ForeAftEnum.AFT;
  b003Below.doors = ForeAftEnum.AFT;

  b001Above.athwartShip = 1;

  b001Below.bulkhead = { fore: 1, foreLcg: 119000 };

  b001Above.perStackInfo = {
    common: { maxHeight: 5000, bottomBase: 21100 },
  };
  b001Below.perStackInfo = {
    each: {
      "00": {
        isoStack: "00",
        bottomBase: 15300,
        maxHeight: 7000,
      },
    },
    common: { maxHeight: 4500, bottomBase: 17200 },
  };

  b003Above.perStackInfo = {
    each: {
      "00": {
        isoStack: "00",
        stackInfoByLength: {
          "20": { size: 20, stackWeight: 1250000, lcg: 100000 },
          "40": { size: 40, stackWeight: 2250000, lcg: 102500 },
          "24": { size: 24, stackWeight: 1260000, lcg: 105000 },
          "45": { size: 45, stackWeight: 2260000, lcg: 107500 },
          "48": { size: 48, stackWeight: 2270000, lcg: 110000 },
        },
      },
    },
    common: { maxHeight: 5500, bottomBase: 21100 },
  };
  b003Below.perStackInfo = {
    each: { "00": { isoStack: "00", bottomBase: 15300, maxHeight: 7000 } },
    common: { maxHeight: 5200, bottomBase: 17200 },
  };
}
