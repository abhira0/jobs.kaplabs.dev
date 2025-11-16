import json
import os
import datetime
from typing import Dict, List, Any
from geopy.geocoders import Nominatim
import time
import threading
import logging
import coloredlogs, collections

# Create a logger object
logger = logging.getLogger(__name__)

# Set the level of the logger to DEBUG
logger.setLevel(logging.DEBUG)

# Create a colored formatter and add it to the logger
coloredlogs.install(
    level="DEBUG",
    logger=logger,
    fmt="%(asctime)s - %(filename)s:%(lineno)d - %(levelname)s - %(message)s",
    field_styles={
        "asctime": {"color": "green"},
        "filename": {"color": "magenta"},
        "lineno": {"color": "magenta"},
        "levelname": {"color": "cyan", "bold": True},
        "message": {"color": "white"},
    },
)


class JSONFile:
    def __init__(self, file_path: str, auto_save: bool = True):
        self.file_path = file_path
        self.data = self.load()
        if auto_save:
            self.start_auto_save()

    def load(self) -> Any:
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w") as f:
                json.dump([], f)
        with open(self.file_path, "r+") as f:
            return json.load(f)

    def save(self, data: Any = []) -> None:
        if data:
            self.data = data
        # Atomic write: write to temp file first, then rename
        temp_path = f"{self.file_path}.tmp"
        with open(temp_path, "w") as f:
            json.dump(data or self.data, f, indent=2)
        os.replace(temp_path, self.file_path)
        return self

    def start_auto_save(self):
        def auto_save():
            while True:
                time.sleep(3)
                self.save()

        thread = threading.Thread(target=auto_save, daemon=True)
        thread.start()


LOCATION_CACHE = JSONFile("utils/locations.json")


# class FilterByDate:
#     def __init__(
#         self, input, cutoff_date: datetime.datetime = datetime.datetime(2024, 1, 1)
#     ):
#         self.input = input
#         self.output = self.process(cutoff_date)

#     def process(self, cutoff_date) -> None:
#         entries = []
#         for listing in self.input.data:
#             date = datetime.datetime.fromtimestamp(int(listing["date_posted"]))
#             if date >= cutoff_date:
#                 entries.append(listing)
#         return LISTINGS_PARSED.save(entries)


class AddCoordinates:
    def __init__(self, input):
        self.input = input
        self.process()

    def get_coord(
        self, location: str, location_cache: Dict, geolocator: Nominatim
    ) -> List:
        location = location.strip()
        if "remote" in location.lower():
            location_cache[location] = ["remote", "remote", "remote"]
        elif not location_cache.get(location) is not None:
            logger.debug(f"API Call! for {location}")
            time.sleep(1)

            loc = geolocator.geocode(location)
            assert loc, f"Location not found, {loc.raw}"

            location_cache[location] = [loc.latitude, loc.longitude, loc.address]
        return location_cache[location]

    def get_all_locations(self, locations: str):
        cleaned_locations = []
        splitter = ["|", ";", "•", " and ", " or "]
        for spli in splitter:
            if spli in locations:
                cleaned_locations += locations.split(spli)
                break
        cleaned_locations = [i.strip() for i in cleaned_locations]
        for i in cleaned_locations:
            if i.endswith(" more"):
                cleaned_locations.remove(i)
        if not cleaned_locations:
            cleaned_locations.append(locations)
        return cleaned_locations

    def process(self):
        location_cache = LOCATION_CACHE.load()
        geolocator = Nominatim(user_agent="location_converter")
        errors = []

        for item in self.input.data:
            locations = self.get_all_locations(item["job_posting_location"])
            if not locations:
                logger.error(f"No locations found for {item['job_posting_location']}")
            item["coordinates"] = []
            for loc in locations:
                try:
                    item["coordinates"].append(
                        self.get_coord(loc, location_cache, geolocator)
                    )
                    # logger.info(f"Coordinates for {loc} is {item['coordinates']}")
                except Exception as e:
                    errors.append(loc)
                    logger.error(
                        f"Error adding coordinates for {loc} : https://simplify.jobs/tracker?id={item['id']}"
                    )

        LOCATION_CACHE.save(location_cache)


class StatusEvents:
    def __init__(self, input):
        self.input = input
        self.process()

    def process(self):
        for item in self.input.data:
            for status in item["status_events"]:
                if status["status"] == 1:
                    status["status"] = "saved"
                elif status["status"] == 2:
                    status["status"] = "applied"
                elif status["status"] == 11:
                    status["status"] = "screen"
                elif status["status"] == 23:
                    status["status"] = "rejected"



class ProcessSalary:
    def __init__(self, input):
        self.input = input
        self.process()

    def process(self):
        hour_map = {2: 40, 3: 40*4.33, 4: 40*52.142}
        for item in self.input.data:
            sal = None
            salary_period = item["salary_period"]
            if item["salary_low"] and item["salary_high"]:
                sal = (item["salary_low"] + item["salary_high"])//2
            elif item["salary_low"] or item["salary_high"]:
                sal = item["salary_low"] or item["salary_high"]
            if sal:
                if salary_period > 1 and sal < 100:
                    logger.error(
                        f"Change salary from anually to hourly ({sal, item['salary_low'], item['salary_high']}): https://simplify.jobs/tracker?id={item['id']}"
                    )
                # if salary_period == 1 and sal > 80:
                #     logger.error(
                #         f"Somethings fishy ({sal, item["salary_low"], item["salary_high"]}): https://simplify.jobs/tracker?id={item['id']}"
                #     )
                if salary_period > 1:
                    sal = sal // hour_map[salary_period]
            item["salary"] = sal


class RemoveUnusedKeys:
    def __init__(self, input):
        self.input = input
        self.process()
        
    def process(self):
        new_data = []
        required_keys = ["status_events", "coordinates", "salary"]
        for item in self.input.data:
            tmp_dict = {}
            for key in required_keys:
                tmp_dict[key] = item[key]
            new_data.append(tmp_dict)
        self.input.data = new_data

def main(from_path: str, to_path: str):
    """Main function that processes all data including coordinates (synchronous)"""
    data = JSONFile(from_path, auto_save=False)

    AddCoordinates(data)
    StatusEvents(data)
    ProcessSalary(data)
    # RemoveUnusedKeys(data)

    JSONFile(to_path, auto_save=False).save(data.data)

def main_without_coordinates(from_path: str, to_path: str):
    """Process data without coordinates - fast initial processing"""
    data = JSONFile(from_path, auto_save=False)

    # Initialize empty coordinates for all items
    for item in data.data:
        item["coordinates"] = []

    StatusEvents(data)
    ProcessSalary(data)
    # RemoveUnusedKeys(data)

    JSONFile(to_path, auto_save=False).save(data.data)

def add_coordinates_to_existing(parsed_path: str):
    """Add coordinates to already parsed data - can be run asynchronously"""
    try:
        logger.info(f"Starting coordinate fetching for {parsed_path}")
        data = JSONFile(parsed_path, auto_save=False)

        AddCoordinates(data)

        # Save the updated data
        JSONFile(parsed_path, auto_save=False).save(data.data)
        logger.info(f"Finished adding coordinates to {len(data.data)} items")
    except Exception as e:
        logger.error(f"Error adding coordinates: {str(e)}", exc_info=True)
