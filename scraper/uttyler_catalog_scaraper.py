import requests
from bs4 import BeautifulSoup
import json

base_url = "https://catalogs.uttyler.edu"

chen_course_url = "https://catalogs.uttyler.edu/2020-2021/Catalog/Courses/CHEN-Chemical-Engineering/2000/CHEN-2310"
courses_url = "https://catalogs.uttyler.edu/2020-2021/Catalog/Courses"
departmental_url = "https://catalogs.uttyler.edu/en/2020-2021/Catalog/Courses/UNIV-University-Wide"

def getRequisites(des):
    pr =  []
    cr = []
    prereq = False
    coreq = False
    next_item= des.next_sibling
    while True:
        if(next_item is None or next_item.string is None):
            break
        if(next_item.name=="h3" and next_item.string.strip()=="Prerequisite"):
            prereq = True
            next_item= next_item.next_sibling
            continue
        if(prereq and next_item.name == "a"):
            pr.append(next_item.string.strip())
            next_item = next_item.next_sibling
            continue
        if("credit" in next_item.string.lower() or "listed" in next_item.string.lower()):
            prereq = False
            next_item= next_item.next_sibling
            continue
        if(next_item.name=="h3" and next_item.string.strip()=="Corequisite"):
            coreq = True
            prereq = False
            next_item = next_item.next_sibling
            continue
        if(coreq and next_item.name == "a"):
            cr.append(next_item.string.strip()) 
            next_item = next_item.next_sibling
            continue

        next_item = next_item.next_sibling
    return pr, cr


# TODO
# add prerequisite and corequisites
def parse_course(url):
    final_dict= {}
    html_string = requests.get(url).content
    soup = BeautifulSoup(html_string, "html.parser")
    h1 = soup.find("h1") 
    final_dict["id"] = h1.span.string.strip()
    final_dict["name"] = h1.span.next_sibling.string.strip()
    description = soup.find(class_="desc")
    final_dict["description"] = " ".join(description.stripped_strings)
    # TODO
    # Get prerequisites and corequisites
    pr, cr = getRequisites(description)
    final_dict["prerequisites"] = pr
    final_dict["corequisites"] = cr
    final_dict["requirementsTo"] = []
    
    return final_dict


# parses a catalogs page for all its links to courses or departments
def parse_catelog_list(url):
    department_links = []
    html_string = requests.get(url).content
    soup = BeautifulSoup(html_string, "html.parser")
    ul = soup.find(class_="sc-child-item-links") 
    refs = ul.find_all("a")
    for ref in refs:
        department_links.append(base_url+ref.get('href'))
    return department_links

# counts the total number of courses offered by UT Tyler
def total_courses():
    
    url = "https://catalogs.uttyler.edu/2020-2021/Catalog/Courses"
    courses = []
    department_links = parse_catelog_list(url)
    for i in department_links:
        courses.extend(parse_catelog_list(i))
    courses = set(courses)
    return len(courses)

def get_all_courses():
    url = "https://catalogs.uttyler.edu/2020-2021/Catalog/Courses"
    courses = []
    print("Getting Department Links")
    department_links = parse_catelog_list(url)
    print("Getting Courses Links")
    for i in department_links:
        courses.extend(parse_catelog_list(i))
    courses = set(courses)
    print("Getting Course Data")
    courses_dict = {} 
    for link in courses:
        item = parse_course(link)
        courses_dict[item["id"]]=item
    print("Added requirementsTo field")
    for course_id in courses_dict:
        for prereq in courses_dict[course_id]["prerequisites"]:
            courses_dict[prereq]["requirementsTo"].append(course_id)
    return courses_dict

courses_dict = get_all_courses()
print("Got Courses Data")
print("Writing to file")
with open("courses_data.json", "w") as outfile:
    json.dump(courses_dict, outfile)

print("Complete")

