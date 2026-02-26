interface Hp {
    "@odata.type": string;
    Location: string;
    Type: string;
}

interface Oem {
    Hp: Hp;
}

interface Status {
    Health: string;
    State: string;
}

export interface FanObject {
    CurrentReading: number;
    FanName: string;
    Oem: Oem;
    Status: Status;
    Units: string;
}

export interface TemperatureObject {
    CurrentReading: number;
    Name: string;
    Number: number;
    Oem: Oem;
    PhysicalContext: string;
    ReadingCelsius: number;
    Status: Status;
    Units: string;
    UpperThresholdCritical: number;
    UpperThresholdFatal: number;
}

export interface TemperatureSummary {
    cpu1: number | null;
    cpu2: number | null;
    hdMax: number | null;
    inletAmbient: number | null;
    all: TemperatureObject[];
}
