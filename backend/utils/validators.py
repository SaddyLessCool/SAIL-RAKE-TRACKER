from fastapi import UploadFile, HTTPException

REQUIRED_COLUMNS = {
    "ZONE", "DVSN", "LOCN", "PLCT RESN", "STTS CODE", "STTS TIME",
    "DVSN FROM", "STTN FROM", "STTN TO", "CC RAKE", "RAKE NAME",
    "LOAD NAME", "LOAD TYPE", "TOTL UNTS", "L/E", "CMDT", "CNSR",
    "CNSG", "LDNG TIME", "TRANSIT TIME", "LOCO NUMB", "LOCO TYPE",
    "RMNG KM", "EXPD ARVLTIME"
    # NOTE: REPORT TIME is intentionally excluded — its absence is valid.
    # The file_parser resolves it via fallback (MAX(STTS TIME) or copy from sibling file).
}


def validate_xlsx_file(file: UploadFile) -> None:
    """Check that the uploaded file has a .xlsx extension."""
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(
            status_code=400,
            detail=f"File '{file.filename}' is not a .xlsx file. Only .xlsx files are accepted."
        )


def validate_columns(df, filename: str) -> None:
    """Check that the DataFrame contains all 25 required columns."""
    file_cols = set(df.columns.tolist())
    missing = REQUIRED_COLUMNS - file_cols
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"File '{filename}' is missing required columns: {sorted(missing)}"
        )