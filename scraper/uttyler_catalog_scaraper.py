import requests
from bs4 import BeautifulSoup

base_url = "https://catalogs.uttyler.edu"

chen_course_url = "https://catalogs.uttyler.edu/2020-2021/Catalog/Courses/CHEN-Chemical-Engineering/2000/CHEN-2310"
courses_url = "https://catalogs.uttyler.edu/2020-2021/Catalog/Courses"
departmental_url = "https://catalogs.uttyler.edu/en/2020-2021/Catalog/Courses/UNIV-University-Wide"

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
    final_dict["description"] = description.p.string.strip()
    # TODO
    # Get prerequisites and corequisites
    final_dict["prerequisites"] = []
    final_dict["corequisites"] = []
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

print(total_courses())
